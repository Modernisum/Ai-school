import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, IndianRupee, Clock, AlertTriangle, Loader, CheckCircle, Ban } from 'lucide-react'
import { listSchools, listPromos, createPromo, updateSchool } from '../../api.js'

export default function BillingPage() {
    const [schools, setSchools] = useState([])
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)

    // Manage School State
    const [showManageModal, setShowManageModal] = useState(false)
    const [manageSchool, setManageSchool] = useState(null)
    const [manageForm, setManageForm] = useState({ perStudentRate: '', applyToAll: false })
    const [manageSubmitting, setManageSubmitting] = useState(false)
    const [manageError, setManageError] = useState('')

    // Promo Modal State
    const [showPromoModal, setShowPromoModal] = useState(false)
    const [promoForm, setPromoForm] = useState({ code: '', creditAmount: '', freeDays: 0, maxUses: 1 })
    const [promoSubmitting, setPromoSubmitting] = useState(false)
    const [promoError, setPromoError] = useState('')

    const loadData = () => {
        Promise.all([listSchools(), listPromos()])
            .then(([schoolsRes, promosRes]) => {
                setSchools(schoolsRes.data || [])
                setPromos(promosRes.data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleCreatePromo = async (e) => {
        e.preventDefault()
        setPromoError('')
        setPromoSubmitting(true)

        if (!promoForm.code || !promoForm.creditAmount) {
            setPromoError('Code and Credit Amount are required')
            setPromoSubmitting(false)
            return
        }

        try {
            const res = await createPromo({
                code: promoForm.code.toUpperCase(),
                creditAmount: promoForm.creditAmount,
                freeDays: promoForm.freeDays,
                maxUses: promoForm.maxUses
            })
            if (res.success) {
                setShowPromoModal(false)
                setPromoForm({ code: '', creditAmount: '', freeDays: 0, maxUses: 1 })
                loadData()
            } else {
                setPromoError(res.message || 'Failed to create promo')
            }
        } catch (err) {
            setPromoError('Network error')
        } finally {
            setPromoSubmitting(false)
        }
    }

    const handleManageSubmit = async (e) => {
        e.preventDefault()
        setManageError('')
        setManageSubmitting(true)

        if (!manageForm.perStudentRate || manageForm.perStudentRate < 0) {
            setManageError('Valid Per-Student Rate is required')
            setManageSubmitting(false)
            return
        }

        try {
            const res = await updateSchool(manageSchool.schoolId, {
                perStudentRate: Number(manageForm.perStudentRate),
                applyToAll: manageForm.applyToAll
            })
            if (res.success) {
                setShowManageModal(false)
                setManageSchool(null)
                loadData()
            } else {
                setManageError(res.message || 'Failed to update billing settings')
            }
        } catch (err) {
            setManageError('Network error')
        } finally {
            setManageSubmitting(false)
        }
    }

    const activeSchools = schools.filter(s => s.status === 'active')
    const totalWalletBalance = activeSchools.reduce((acc, curr) => acc + Number(curr.walletBalance || 0), 0)

    // Calculate Monthly Recurring Revenue (MRR) dynamically
    // Formula for pure MRR based on active configuration: (per_student_rate * active_student_count) 
    // *We'll use a placeholder for active students since the API might not return it yet*
    const currentMRR = activeSchools.reduce((acc, curr) => acc + (Number(curr.perStudentRate || 50) * 100), 0) // Placeholder logic for now

    const atRiskSchools = schools.filter(s => s.billingStatus === 'warning' || s.billingStatus === 'suspended')

    const stats = [
        { label: 'Total MRR (Est.)', value: `₹${currentMRR.toLocaleString()}`, color: '#10b981', icon: <IndianRupee size={18} /> },
        { label: 'Total Wallet Liabilities', value: `₹${totalWalletBalance.toLocaleString()}`, color: '#6366f1', icon: <Wallet size={18} /> },
        { label: 'Warning / Suspended', value: atRiskSchools.length, color: '#ef4444', icon: <AlertTriangle size={18} /> },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="page"
        >
            <h1 className="page-title">SaaS Revenue & Billing</h1>
            <p className="page-sub">Monitor school wallets, set per-student pricing, and manage promos.</p>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                        {stats.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="stat-card"
                            >
                                <div className="stat-icon" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                                    {s.icon}
                                </div>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="card">
                        <div style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>School Wallets</h2>
                            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                                + Recharge Wallet
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto', padding: '24px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>School Name</th>
                                        <th>Billing Status</th>
                                        <th>Per Student Rate</th>
                                        <th>Wallet Balance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schools.map(s => (
                                        <tr key={s.schoolId}>
                                            <td style={{ fontWeight: 500 }}>{s.schoolName}</td>
                                            <td>
                                                <span className={`badge ${s.billingStatus || 'active'}`} style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    backgroundColor: s.billingStatus === 'suspended' ? '#fee2e2' : s.billingStatus === 'warning' ? '#fef3c7' : '#d1fae5',
                                                    color: s.billingStatus === 'suspended' ? '#991b1b' : s.billingStatus === 'warning' ? '#92400e' : '#065f46',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    {s.billingStatus === 'suspended' ? <Ban size={12} /> : s.billingStatus === 'warning' ? <Clock size={12} /> : <CheckCircle size={12} />}
                                                    {(s.billingStatus || 'active').charAt(0).toUpperCase() + (s.billingStatus || 'active').slice(1)}
                                                </span>
                                            </td>
                                            <td>₹{(s.perStudentRate || 50).toLocaleString()} /mo</td>
                                            <td style={{
                                                color: s.walletBalance <= 0 ? '#ef4444' : 'inherit',
                                                fontWeight: s.walletBalance <= 0 ? 600 : 400
                                            }}>
                                                ₹{Number(s.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '4px 12px', fontSize: '13px' }}
                                                    onClick={() => {
                                                        setManageSchool(s)
                                                        setManageForm({ perStudentRate: s.perStudentRate || 50, applyToAll: false })
                                                        setShowManageModal(true)
                                                    }}
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {schools.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
                                                No schools configured for billing yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                        <div style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Promo Codes</h2>
                            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setShowPromoModal(true)}>
                                + Create Promo
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto', padding: '24px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Credit Amount</th>
                                        <th>Free Trial Days</th>
                                        <th>Uses (Current / Max)</th>
                                        <th>Created Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promos.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--accent)', letterSpacing: '1px' }}>{p.code}</td>
                                            <td>₹{Number(p.creditAmount || 0).toLocaleString()}</td>
                                            <td>{p.freeDays} days</td>
                                            <td>{p.currentUses} / {p.maxUses}</td>
                                            <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {promos.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
                                                No promo codes available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {showPromoModal && (
                        <div className="modal-overlay" onClick={() => setShowPromoModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="modal-content" onClick={e => e.stopPropagation()}
                                style={{ maxWidth: 450 }}
                            >
                                <div className="modal-header">
                                    <h2 style={{ fontSize: 18, fontWeight: 600 }}>Create Promo Code</h2>
                                    <button className="btn-close" onClick={() => setShowPromoModal(false)}>×</button>
                                </div>
                                <form onSubmit={handleCreatePromo} style={{ padding: 20 }}>
                                    <div className="form-group" style={{ marginBottom: 15 }}>
                                        <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Promo Code Name</label>
                                        <input
                                            type="text"
                                            value={promoForm.code}
                                            onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. WELCOME5000"
                                            className="input-field"
                                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)' }}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 15 }}>
                                        <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Credit Amount (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={promoForm.creditAmount}
                                            onChange={e => setPromoForm({ ...promoForm, creditAmount: e.target.value })}
                                            placeholder="5000"
                                            className="input-field"
                                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Free Days</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={promoForm.freeDays}
                                                onChange={e => setPromoForm({ ...promoForm, freeDays: parseInt(e.target.value) || 0 })}
                                                className="input-field"
                                                style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Max Uses</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={promoForm.maxUses}
                                                onChange={e => setPromoForm({ ...promoForm, maxUses: parseInt(e.target.value) || 1 })}
                                                className="input-field"
                                                style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                    </div>

                                    {promoError && (
                                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
                                            {promoError}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                        <button type="button" className="btn" onClick={() => setShowPromoModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={promoSubmitting}>
                                            {promoSubmitting ? 'Creating...' : 'Create Promo Code'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showManageModal && manageSchool && (
                        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="modal-content" onClick={e => e.stopPropagation()}
                                style={{ maxWidth: 450 }}
                            >
                                <div className="modal-header">
                                    <h2 style={{ fontSize: 18, fontWeight: 600 }}>Manage Billing for {manageSchool.schoolName}</h2>
                                    <button className="btn-close" onClick={() => setShowManageModal(false)}>×</button>
                                </div>
                                <form onSubmit={handleManageSubmit} style={{ padding: 20 }}>
                                    <div className="form-group" style={{ marginBottom: 15 }}>
                                        <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Per Student Rate (₹) / month</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={manageForm.perStudentRate}
                                            onChange={e => setManageForm({ ...manageForm, perStudentRate: e.target.value })}
                                            className="input-field"
                                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input
                                            type="checkbox"
                                            id="applyToAll"
                                            checked={manageForm.applyToAll}
                                            onChange={e => setManageForm({ ...manageForm, applyToAll: e.target.checked })}
                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                        />
                                        <label htmlFor="applyToAll" style={{ fontSize: 14, cursor: 'pointer', color: 'var(--text)', userSelect: 'none' }}>
                                            Apply this rate to <strong>all schools</strong> across the platform
                                        </label>
                                    </div>

                                    {manageError && (
                                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
                                            {manageError}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                        <button type="button" className="btn" onClick={() => setShowManageModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={manageSubmitting}>
                                            {manageSubmitting ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    )
}
