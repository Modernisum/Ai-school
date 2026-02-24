import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Ban, CheckCircle, Key, Clock, Loader } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { getSchool, updateSchool, setStatus, setSessionDuration } from '../api.js'

export default function SchoolDetail() {
    const { schoolId } = useParams()
    const nav = useNavigate()
    const toast = useContext(ToastCtx)
    const [school, setSchool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [edits, setEdits] = useState({})
    const [saving, setSaving] = useState(false)
    const [sessionHours, setSessionHours] = useState(24)

    const load = async () => {
        setLoading(true)
        const r = await getSchool(schoolId)
        if (r.data) {
            setSchool(r.data)
            setSessionHours(r.data.sessionDurationHours || 24)
            setEdits({
                schoolName: r.data.schoolName,
                ...(r.data.data || {}),
            })
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [schoolId])

    const set = (k, v) => setEdits(e => ({ ...e, [k]: v }))

    const save = async () => {
        setSaving(true)
        const r = await updateSchool(schoolId, edits)
        if (r.success) toast('success', 'School updated')
        else toast('error', r.message)
        setSaving(false)
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

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    if (!school) return <div className="page" style={{ color: 'var(--text3)' }}>School not found.</div>

    const Field = ({ label, field, type = 'text' }) => (
        <div className="input-group">
            <label>{label}</label>
            <input type={type} value={edits[field] || ''} onChange={e => set(field, e.target.value)} />
        </div>
    )

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Edit form */}
                <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>School Details</h3>
                    <Field label="School Name" field="schoolName" />
                    <Field label="Principal Name" field="principalName" />
                    <Field label="Address" field="address" />
                    <Field label="Phone" field="phone" type="tel" />
                    <Field label="Email" field="email" type="email" />
                    <Field label="Affiliated Board" field="affiliatedBoard" />
                    <Field label="School Type" field="schoolType" />
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ marginTop: 4 }}>
                        {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />} Save Changes
                    </button>
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
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Info</h3>
                        {[
                            ['School ID', school.schoolId],
                            ['Status', school.status],
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
