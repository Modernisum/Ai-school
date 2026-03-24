import { useState, useContext, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader, CheckCircle, Copy, X, MapPin, School, BookOpen, ChevronRight, ChevronLeft, Shield } from 'lucide-react'
import { ToastCtx } from '../App.jsx'

const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
const API_BASE = `http://${HOST}:8080/api`;

const Field = ({ label, field, type = 'text', required, placeholder, form, set, error, maxLength }) => (
    <div className="input-group">
        <label>{label}{required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
        <input
            type={type} value={form[field]}
            onChange={e => set(field, e.target.value)}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            className={error ? 'input-error' : ''}
        />
        {error && <span className="error-text">{error}</span>}
    </div>
)

export default function SetupPage() {
    const toast = useContext(ToastCtx)
    const [step, setStep] = useState(1)
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

    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(null)

    useEffect(() => {
        fetch(`${API_BASE}/geo/countries`).then(res => res.json()).then(setCountries).catch(console.error)
    }, [])

    useEffect(() => {
        if (form.countryId) {
            setStatesList([])
            setDistricts([])
            fetch(`${API_BASE}/geo/states/${form.countryId}`).then(res => res.json()).then(setStatesList).catch(console.error)
        }
    }, [form.countryId])

    useEffect(() => {
        if (form.stateId) {
            setDistricts([])
            fetch(`${API_BASE}/geo/districts/${form.stateId}`).then(res => res.json()).then(setDistricts).catch(console.error)
        }
    }, [form.stateId])

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const validateStep = (s) => {
        const errs = {}
        if (s === 1) {
            if (!form.schoolName) errs.schoolName = 'Required'
            if (!form.addressLine) errs.addressLine = 'Required'
            if (!form.pincode) errs.pincode = 'Required'
            if (!form.countryId) errs.countryId = 'Required'
            if (!form.stateId) errs.stateId = 'Required'
            if (!form.districtId) errs.districtId = 'Required'
            
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
            const phoneDigitsOnly = form.phone.replace(/\D/g, '')
            if (phoneDigitsOnly.length !== 10) errs.phone = 'Should be exactly 10 digits'
        } else if (s === 2) {
            if (!form.password || form.password.length < 6) errs.password = 'Min 6 characters'
        }
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const next = () => { if (validateStep(step)) setStep(s => s + 1) }
    const back = () => setStep(s => s - 1)

    const classNameToLevel = (name) => {
        if (name === 'Pre-Nursery') return -2;
        if (name === 'Nursery') return -1;
        if (name === 'Kindergarten') return 0;
        const match = name.match(/Class (\d+)/);
        if (match) return parseInt(match[1]);
        return 1;
    };

    const submit = async (e) => {
        e.preventDefault()
        if (!validateStep(3)) return
        setLoading(true)
        try {
            const country = countries.find(c => c.id == form.countryId);
            const stateName = statesList.find(c => c.id == form.stateId)?.name || '';
            const districtName = districts.find(c => c.id == form.districtId)?.name || '';
            
            // Format phone with country code
            const formattedPhone = `${country?.phone_code || ''} ${form.phone.replace(/\D/g, '')}`.trim();

            const payload = {
                ...form,
                phone: formattedPhone,
                schoolAddress: `${form.addressLine}, ${districtName}, ${stateName}, ${country?.name || ''} - ${form.pincode}`,
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
                setStep(1)
            } else {
                toast('error', data.message || 'Setup failed')
            }
        } catch {
            toast('error', 'Connection failed')
        }
        setLoading(false)
    }

    const classes = ['Pre-Nursery', 'Nursery', 'Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)]

    const countryCode = countries.find(c => c.id == form.countryId)?.phone_code || ''

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Plus size={22} style={{ color: 'var(--accent)' }} />
                <h1 className="page-title">Add New School</h1>
            </div>
            <p className="page-sub">Step {step} of 3 • {step === 1 ? 'School Details & Address' : step === 2 ? 'Security & Admin' : 'Academic Setup'}</p>

            {/* Stepper Header */}
            <div className="stepper-box">
                {[
                    { n: 1, icon: <School size={14} />, label: 'Details' },
                    { n: 2, icon: <Shield size={14} />, label: 'Security' },
                    { n: 3, icon: <BookOpen size={14} />, label: 'Academic' }
                ].map((s, i) => (
                    <div key={s.n} className={`step-item ${step >= s.n ? 'active' : ''}`}>
                        <div className="step-num">{s.icon}</div>
                        <span>{s.label}</span>
                        {i < 2 && <div className="step-line" />}
                    </div>
                ))}
            </div>

            <form onSubmit={submit} className="setup-form">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><School size={16} /> Basic Details & Address</h3>
                            <div className="field-grid">
                                <Field form={form} set={set} label="School Name" field="schoolName" required placeholder="e.g. Modern High School" error={errors.schoolName} />
                                <Field form={form} set={set} label="Address Line" field="addressLine" required placeholder="Street, Locality" error={errors.addressLine} />
                                <div className="input-group">
                                    <label>Country *</label>
                                    <select value={form.countryId} onChange={e => set('countryId', e.target.value)} className={errors.countryId ? 'input-error' : ''}>
                                        <option value="">Select country…</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>State *</label>
                                    <select value={form.stateId} onChange={e => set('stateId', e.target.value)} disabled={!form.countryId} className={errors.stateId ? 'input-error' : ''}>
                                        <option value="">Select state…</option>
                                        {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>District *</label>
                                    <select value={form.districtId} onChange={e => set('districtId', e.target.value)} disabled={!form.stateId} className={errors.districtId ? 'input-error' : ''}>
                                        <option value="">Select district…</option>
                                        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <Field form={form} set={set} label="Pincode" field="pincode" required placeholder="PIN Code" error={errors.pincode} />
                                <Field form={form} set={set} label="Email Address" field="email" type="email" placeholder="school@example.com" error={errors.email} />
                                <div className="input-group">
                                    <label>Contact Number *</label>
                                    <div className="phone-input-wrap">
                                        <span className="country-code">{countryCode || '+'}</span>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => set('phone', e.target.value.replace(/\D/g, '').substring(0, 10))}
                                            placeholder="10 digit number"
                                            required
                                            className={errors.phone ? 'input-error' : ''}
                                        />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><Shield size={16} /> Security & Admin</h3>
                            <div className="field-grid">
                                <Field form={form} set={set} label="Principal Name" field="principalName" placeholder="Full name" />
                                <Field form={form} set={set} label="Admin Password" field="password" type="password" required placeholder="Min 6 chars" error={errors.password} />
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><BookOpen size={16} /> Academic Configuration</h3>
                            <div className="field-grid">
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
                                    <label>Class Range</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <select value={form.classLevelStart} onChange={e => set('classLevelStart', e.target.value)} style={{ flex: 1 }}>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <span style={{ color: 'var(--text3)' }}>to</span>
                                        <select value={form.classLevelEnd} onChange={e => set('classLevelEnd', e.target.value)} style={{ flex: 1 }}>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="setup-footer">
                    {step > 1 ? (
                        <button type="button" className="btn btn-ghost" onClick={back} disabled={loading}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                    ) : <div />}
                    
                    {step < 3 ? (
                        <button type="button" className="btn btn-primary" onClick={next} style={{ minWidth: 120 }}>
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 160, justifyContent: 'center' }}>
                            {loading ? <Loader size={15} className="spin" /> : <Plus size={15} />}
                            {loading ? 'Finalizing…' : 'Create School'}
                        </button>
                    )}
                </div>
            </form>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-bg">
                        <motion.div initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className="modal" style={{ maxWidth: 450 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircle size={24} style={{ color: '#10b981' }} />
                                    <h3 style={{ margin: 0, color: '#10b981', fontSize: 18 }}>School Created</h3>
                                </div>
                                <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSuccess(null)} />
                            </div>
                            <div className="success-box">
                                <div className="row"><span>School ID</span> <strong>{success.schoolId}</strong></div>
                                <div className="row"><span>Password</span> <strong>{success.password}</strong></div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => {
                                const text = `School ID: ${success.schoolId}\nPassword: ${success.password}`;
                                navigator.clipboard.writeText(text);
                                toast('success', 'Credentials copied!');
                            }}>
                                <Copy size={16} /> Copy Credentials
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .stepper-box { display: flex; justify-content: space-between; margin: 24px 0 32px; padding: 0 40px; position: relative; }
                .step-item { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; color: var(--text3); }
                .step-item.active { color: var(--accent); }
                .step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--bg3); display: flex; align-items: center; justifyContent: center; border: 2px solid transparent; transition: 0.3s; }
                .active .step-num { background: var(--accent); color: white; border-color: rgba(255,255,255,0.2); box-shadow: 0 0 15px rgba(99,102,241,0.3); }
                .step-item span { font-size: 12px; font-weight: 600; }
                .step-line { position: absolute; top: 16px; left: 100%; width: calc(200% - 32px); height: 2px; background: var(--bg3); z-index: -1; }
                .active .step-line { background: var(--accent); opacity: 0.3; }
                .section-title { display: flex; alignItems: center; gap: 10; margin: 0 0 20px; font-size: 14px; color: var(--accent); }
                .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .setup-footer { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--bg3); }
                .phone-input-wrap { display: flex; border: 1px solid var(--bg3); border-radius: 8px; overflow: hidden; background: var(--bg2); }
                .country-code { background: var(--bg3); padding: 0 12px; display: flex; align-items: center; font-size: 13px; color: var(--text2); font-weight: 600; border-right: 1px solid var(--bg3); }
                .phone-input-wrap input { border: none !important; }
                .input-error { border-color: var(--red) !important; }
                .error-text { font-size: 11px; color: var(--red); margin-top: 4px; }
                .success-box { background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; }
                .success-box .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </motion.div>
    )
}
