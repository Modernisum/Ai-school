import { useState, useContext } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader, CheckCircle } from 'lucide-react'
import { ToastCtx } from '../App.jsx'

const API_BASE = 'http://localhost:8080/api'

export default function SetupPage() {
    const toast = useContext(ToastCtx)
    const [form, setForm] = useState({
        schoolName: '',
        password: '',
        principalName: '',
        address: '',
        phone: '',
        email: '',
        affiliatedBoard: '',
        classLevelStart: 'Pre-Nursery',
        classLevelEnd: 'Class 12',
        schoolType: 'Co-Ed',
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(null)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const submit = async (e) => {
        e.preventDefault()
        if (!form.schoolName || !form.password) return
        setLoading(true)
        setSuccess(null)
        try {
            const res = await fetch(`${API_BASE}/setup/school`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.success || data.schoolId) {
                setSuccess(data)
                toast('success', `School "${form.schoolName}" created! ID: ${data.schoolId}`)
                setForm({
                    schoolName: '', password: '', principalName: '', address: '',
                    phone: '', email: '', affiliatedBoard: '',
                    classLevelStart: 'Pre-Nursery', classLevelEnd: 'Class 12', schoolType: 'Co-Ed',
                })
            } else {
                toast('error', data.message || 'Setup failed')
            }
        } catch {
            toast('error', 'Connection failed')
        }
        setLoading(false)
    }

    const Field = ({ label, field, type = 'text', required, placeholder }) => (
        <div className="input-group">
            <label>{label}{required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
            <input
                type={type} value={form[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                required={required}
            />
        </div>
    )

    const classes = ['Pre-Nursery', 'Nursery', 'Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)]

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Plus size={22} style={{ color: 'var(--accent)' }} />
                <h1 className="page-title">Add New School</h1>
            </div>
            <p className="page-sub">Register a new school into the system</p>

            {success && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <CheckCircle size={20} style={{ color: '#34d399', flexShrink: 0 }} />
                    <div>
                        <p style={{ fontWeight: 700, color: '#34d399', marginBottom: 4 }}>School Created Successfully!</p>
                        <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                            School ID: <code style={{ color: 'var(--accent)' }}>{success.schoolId}</code> &nbsp;|&nbsp;
                            School Code: <code style={{ color: 'var(--accent)' }}>{success.schoolCode}</code>
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Basic Information</h3>
                        <Field label="School Name" field="schoolName" required placeholder="e.g. Delhi Public School" />
                        <Field label="Admin Password" field="password" type="password" required placeholder="Set login password" />
                        <Field label="Principal Name" field="principalName" placeholder="Full name" />
                        <Field label="Email" field="email" type="email" placeholder="school@example.com" />
                        <Field label="Phone" field="phone" type="tel" placeholder="+91 XXXXX XXXXX" />
                        <Field label="Address" field="address" placeholder="Full address" />
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Academic Setup</h3>
                        <div className="input-group">
                            <label>Affiliated Board</label>
                            <select value={form.affiliatedBoard} onChange={e => set('affiliatedBoard', e.target.value)}>
                                <option value="">Select board…</option>
                                {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>School Type</label>
                            <select value={form.schoolType} onChange={e => set('schoolType', e.target.value)}>
                                {['Co-Ed', 'Boys', 'Girls'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Class From</label>
                            <select value={form.classLevelStart} onChange={e => set('classLevelStart', e.target.value)}>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Class To</label>
                            <select value={form.classLevelEnd} onChange={e => set('classLevelEnd', e.target.value)}>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 160, justifyContent: 'center' }}>
                        {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                        {loading ? 'Creating School…' : 'Create School'}
                    </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </form>
        </motion.div>
    )
}
