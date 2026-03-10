import { useState, useContext, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader, CheckCircle, Copy, X } from 'lucide-react'
import { ToastCtx } from '../App.jsx'

const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
const API_BASE = `http://${HOST}:8080/api`;

const Field = ({ label, field, type = 'text', required, placeholder, form, set }) => (
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

export default function SetupPage() {
    const toast = useContext(ToastCtx)
    const [countries, setCountries] = useState([])
    const [statesList, setStatesList] = useState([])
    const [districts, setDistricts] = useState([])
    const [form, setForm] = useState({
        schoolName: '',
        password: '',
        principalName: '',
        addressLine: '',
        countryId: '',
        stateId: '',
        districtId: '',
        pincode: '',
        phone: '',
        email: '',
        affiliatedBoard: '',
        medium: 'English',
        classLevelStart: 'Pre-Nursery',
        classLevelEnd: 'Class 12',
        schoolType: 'Co-Ed',
    })

    useEffect(() => {
        fetch(`${API_BASE}/geo/countries`).then(res => res.json()).then(setCountries).catch(console.error)
    }, [])

    useEffect(() => {
        setForm(f => ({ ...f, stateId: '', districtId: '' }))
        setStatesList([])
        if (form.countryId) {
            fetch(`${API_BASE}/geo/states/${form.countryId}`).then(res => res.json()).then(setStatesList).catch(console.error)
            
            // Auto-fill phone code
            const country = countries.find(c => c.id == form.countryId)
            if (country && !form.phone) {
                setForm(f => ({ ...f, phone: country.phone_code + ' ' }))
            }
        }
    }, [form.countryId, countries])

    useEffect(() => {
        setForm(f => ({ ...f, districtId: '' }))
        setDistricts([])
        if (form.stateId) {
            fetch(`${API_BASE}/geo/districts/${form.stateId}`).then(res => res.json()).then(setDistricts).catch(console.error)
        }
    }, [form.stateId])

    const classNameToLevel = (name) => {
        if (name === 'Pre-Nursery') return -2;
        if (name === 'Nursery') return -1;
        if (name === 'Kindergarten') return 0;
        const match = name.match(/Class (\d+)/);
        if (match) return parseInt(match[1]);
        return 1;
    };
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(null)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const submit = async (e) => {
        e.preventDefault()
        if (!form.schoolName || !form.password) return
        setLoading(true)
        setSuccess(null)
        try {
            const countryName = countries.find(c => c.id == form.countryId)?.name || '';
            const stateName = statesList.find(c => c.id == form.stateId)?.name || '';
            const districtName = districts.find(c => c.id == form.districtId)?.name || '';
            
            const payload = {
                ...form,
                schoolAddress: `${form.addressLine}, ${districtName}, ${stateName}, ${countryName} - ${form.pincode}`,
                classLevelStart: classNameToLevel(form.classLevelStart),
                classLevel: classNameToLevel(form.classLevelEnd),
                defaultStudents: 30
            }
            const res = await fetch(`${API_BASE}/setup/school`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (data.success || data.schoolId) {
                setSuccess({ ...data, password: form.password, schoolName: form.schoolName })
                setForm({
                    schoolName: '', password: '', principalName: '', addressLine: '', countryId: '', stateId: '', districtId: '', pincode: '',
                    phone: '', email: '', affiliatedBoard: '', medium: 'English',
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

    const copyDetails = () => {
        if (!success) return;
        const text = `School Name: ${success.schoolName}\nSchool ID: ${success.schoolId}\nAdmin Password: ${success.password}`;
        navigator.clipboard.writeText(text);
        toast('success', 'Details copied to clipboard!');
    };

    const classes = ['Pre-Nursery', 'Nursery', 'Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)]

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Plus size={22} style={{ color: 'var(--accent)' }} />
                <h1 className="page-title">Add New School</h1>
            </div>
            <p className="page-sub">Register a new school into the system</p>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-bg" style={{ zIndex: 1000 }}>
                        <motion.div initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, scale: 0.95 }} className="modal" style={{ maxWidth: 450 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircle size={24} style={{ color: '#10b981' }} />
                                    <h3 style={{ margin: 0, color: '#10b981', fontSize: 18 }}>School Created</h3>
                                </div>
                                <button className="action-btn" onClick={() => setSuccess(null)}><X size={18} /></button>
                            </div>

                            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                                <strong>{success.schoolName}</strong> has been successfully registered. Please save these credentials:
                            </p>

                            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>School ID</span>
                                    <code style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 'bold' }}>{success.schoolId}</code>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>Admin Password</span>
                                    <code style={{ color: 'var(--text)', fontSize: 14 }}>{success.password}</code>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSuccess(null)}>
                                    Close
                                </button>
                                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={copyDetails}>
                                    <Copy size={16} /> Copy Details
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Basic Information</h3>
                        <Field form={form} set={set} label="School Name" field="schoolName" required placeholder="e.g. Delhi Public School" />
                        <Field form={form} set={set} label="Admin Password" field="password" type="password" required placeholder="Set login password" />
                        <Field form={form} set={set} label="Principal Name" field="principalName" placeholder="Full name" />
                        <Field form={form} set={set} label="Email" field="email" type="email" placeholder="school@example.com" />
                        <Field form={form} set={set} label="Phone" field="phone" type="tel" placeholder="+91 XXXXX XXXXX" />
                        <div className="input-group">
                            <label>Country *</label>
                            <select value={form.countryId} onChange={e => set('countryId', e.target.value)} required>
                                <option value="">Select country…</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>State *</label>
                            <select value={form.stateId} onChange={e => set('stateId', e.target.value)} required disabled={!form.countryId}>
                                <option value="">Select state…</option>
                                {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>District *</label>
                            <select value={form.districtId} onChange={e => set('districtId', e.target.value)} required disabled={!form.stateId}>
                                <option value="">Select district…</option>
                                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                            <Field form={form} set={set} label="Address Line" field="addressLine" required placeholder="Street, Locality" />
                            <Field form={form} set={set} label="Pincode" field="pincode" required placeholder="PIN" />
                        </div>
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
                            <label>Medium of Instruction</label>
                            <select value={form.medium} onChange={e => set('medium', e.target.value)}>
                                {['English', 'Hindi', 'Spanish', 'French', 'Standard Arabic', 'Bengali', 'Russian', 'Portuguese', 'Urdu', 'Indonesian', 'German', 'Japanese', 'Marathi', 'Telugu', 'Turkish', 'Tamil'].map(b => (
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
