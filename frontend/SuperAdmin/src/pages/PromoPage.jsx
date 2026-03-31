import { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Plus, Save, X, Loader, Trash2, ShieldCheck, Clock, Layers } from 'lucide-react'
import { listPromos, createPromo, getPromoUsage } from '../api.js'
import { ToastCtx } from '../App.jsx'

export default function PromoPage() {
    const toast = useContext(ToastCtx)
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        code: '',
        creditAmount: '0',
        freeDays: 0,
        discountPercentage: '0',
        expiresAt: '',
        maxUses: 10,
    })
    const [usageData, setUsageData] = useState([])
    const [showUsage, setShowUsage] = useState(false)
    const [selectedPromo, setSelectedPromo] = useState(null)

    const load = async () => {
        setLoading(true)
        const r = await listPromos()
        if (r.data) setPromos(r.data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.code) return toast('error', 'Code is required')
        setSaving(true)
        const r = await createPromo(form)
        if (r.success) {
            toast('success', 'Promo code created')
            setShowAdd(false)
            setForm({ code: '', creditAmount: '0', freeDays: 0, discountPercentage: '0', expiresAt: '', maxUses: 10 })
            load()
        } else {
            toast('error', r.message)
        }
        setSaving(false)
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Promo Codes</h1>
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>Manage institutional discounts and incentives</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={16} /> Create Code
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Incentive</th>
                                <th>Usage</th>
                                <th>Expires At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promos.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>No promo codes found</td>
                                </tr>
                            ) : promos.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                padding: '4px 8px',
                                                background: 'var(--glass)',
                                                border: '1px dashed var(--accent)',
                                                borderRadius: 4,
                                                fontWeight: 700,
                                                fontSize: 12,
                                                letterSpacing: 0.5
                                            }}>
                                                {p.code}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column' }}>
                                            {Number(p.creditAmount) > 0 && <span style={{ color: 'var(--green)' }}>₹{p.creditAmount} Credit</span>}
                                            {Number(p.discountPercentage) > 0 && <span style={{ color: 'var(--accent)' }}>{p.discountPercentage}% Discount</span>}
                                            {p.freeDays > 0 && <span style={{ color: 'var(--blue)' }}>{p.freeDays} Days Free</span>}
                                            {Number(p.creditAmount) === 0 && Number(p.discountPercentage) === 0 && p.freeDays === 0 && <span style={{ color: 'var(--text3)' }}>No Incentive</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 11 }}>
                                            <span style={{ fontWeight: 600 }}>{p.currentUses}</span>
                                            <span style={{ color: 'var(--text3)' }}> / {p.maxUses}</span>
                                            <div style={{ width: 60, height: 4, background: 'var(--glass-border)', borderRadius: 2, marginTop: 4 }}>
                                                <div style={{
                                                    width: `${Math.min(100, (p.currentUses / p.maxUses) * 100)}%`,
                                                    height: '100%',
                                                    background: 'var(--accent)',
                                                    borderRadius: 2
                                                }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                            {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Never'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                title="View Usage"
                                                onClick={async () => {
                                                    const u = await getPromoUsage(p.id);
                                                    if (u.data) setUsageData(u.data);
                                                    setSelectedPromo(p.code);
                                                    setShowUsage(true);
                                                }}
                                            >
                                                <Layers size={13} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} title="Delete">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {showAdd && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="card card-modal"
                            style={{ width: 400 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Promo Code</h3>
                                <button className="btn btn-ghost btn-xs" onClick={() => setShowAdd(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="input-group">
                                    <label>Code (e.g. WELCOME100)</label>
                                    <input
                                        type="text"
                                        placeholder="UPPERCASE"
                                        value={form.code}
                                        onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="input-group">
                                        <label>Credit (₹)</label>
                                        <input
                                            type="number"
                                            value={form.creditAmount}
                                            onChange={e => setForm({ ...form, creditAmount: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Discount (%)</label>
                                        <input
                                            type="number"
                                            value={form.discountPercentage}
                                            onChange={e => setForm({ ...form, discountPercentage: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Free Days</label>
                                        <input
                                            type="number"
                                            value={form.freeDays}
                                            onChange={e => setForm({ ...form, freeDays: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Expires At (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={form.expiresAt}
                                            onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Max Usage Count</label>
                                    <input
                                        type="number"
                                        value={form.maxUses}
                                        onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                        {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Create
                                    </button>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showUsage && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="card card-modal"
                            style={{ width: 500, maxHeight: '80vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Usage: {selectedPromo}</h3>
                                <button className="btn btn-ghost btn-xs" onClick={() => setShowUsage(false)}><X size={16} /></button>
                            </div>

                            {usageData.length === 0 ? (
                                <p style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>No usage data found.</p>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>School Name</th>
                                            <th>Applied At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usageData.map((u, i) => (
                                            <tr key={i}>
                                                <td>{u.schoolName} <span style={{ color: 'var(--text3)', fontSize: 10 }}>({u.schoolId})</span></td>
                                                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(u.appliedAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .card-modal { background: var(--card-bg); border: 1px solid var(--glass-border); padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
                @keyframes spin{to{transform:rotate(360deg)}}
            `}</style>
        </motion.div>
    )
}
