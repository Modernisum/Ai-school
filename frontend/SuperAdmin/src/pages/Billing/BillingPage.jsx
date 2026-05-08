import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Clock, AlertTriangle, CheckCircle, Ban, TrendingUp, RefreshCw, PlusCircle, History } from 'lucide-react'
import { listSchools, listPromos, createPromo, updateSchool, processRefund, getWalletLedger } from '../../api.js'
import { StatCard, Modal, StatusBadge, formatCurrency } from '../../components/ui/index.js'

export default function BillingPage() {
    const [schools, setSchools] = useState([])
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)

    const [showLedgerModal, setShowLedgerModal] = useState(false)
    const [ledgerSchool, setLedgerSchool] = useState(null)
    const [ledgerData, setLedgerData] = useState([])
    const [ledgerLoading, setLedgerLoading] = useState(false)

    const [showManageModal, setShowManageModal] = useState(false)
    const [manageSchool, setManageSchool] = useState(null)
    const [manageForm, setManageForm] = useState({ perStudentRate: '', applyToAll: false })
    const [manageSubmitting, setManageSubmitting] = useState(false)
    const [manageError, setManageError] = useState('')

    const [showPromoModal, setShowPromoModal] = useState(false)
    const [promoForm, setPromoForm] = useState({ code: '', creditAmount: '', freeDays: 0, maxUses: 1 })
    const [promoSubmitting, setPromoSubmitting] = useState(false)
    const [promoError, setPromoError] = useState('')

    const [showRefundModal, setShowRefundModal] = useState(false)
    const [refundSchool, setRefundSchool] = useState(null)
    const [refundForm, setRefundForm] = useState({ amount: '', description: 'Manual Adjustment' })
    const [refundSubmitting, setRefundSubmitting] = useState(false)
    const [refundError, setRefundError] = useState('')

    const loadData = () => {
        setLoading(true)
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

    const handleRefundSubmit = async (e) => {
        e.preventDefault()
        setRefundError('')
        setRefundSubmitting(true)

        if (!refundForm.amount) {
            setRefundError('Amount is required')
            setRefundSubmitting(false)
            return
        }

        try {
            const res = await processRefund(refundSchool.schoolId, {
                amount: refundForm.amount,
                description: refundForm.description
            })
            if (res.success) {
                setShowRefundModal(false)
                setRefundSchool(null)
                setRefundForm({ amount: '', description: 'Manual Adjustment' })
                loadData()
            } else {
                setRefundError(res.message || 'Failed to process adjustment')
            }
        } catch (err) {
            setRefundError('Network error')
        } finally {
            setRefundSubmitting(false)
        }
    }

    const handleViewLedger = async (school) => {
        setLedgerSchool(school)
        setLedgerLoading(true)
        setShowLedgerModal(true)
        try {
            const res = await getWalletLedger(school.schoolId)
            if (res.success) {
                setLedgerData(res.data)
            }
        } catch (err) {
            console.error("Failed to fetch ledger", err)
        } finally {
            setLedgerLoading(false)
        }
    }

    const activeSchools = schools.filter(s => s.status === 'active')
    const totalWalletBalance = activeSchools.reduce((acc, curr) => acc + Number(curr.walletBalance || 0), 0)
    const currentMRR = activeSchools.reduce((acc, curr) => acc + (Number(curr.perStudentRate || 50) * (curr.activeStudentCount || 0)), 0)
    const atRiskSchools = schools.filter(s => s.billingStatus === 'warning' || s.billingStatus === 'suspended')

    const getNextBilling = (lastDate) => {
        if (!lastDate) return 'Pending'
        const date = new Date(lastDate)
        date.setDate(date.getDate() + 30)
        return date.toLocaleDateString()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="page"
        >
            <h1 className="page-title">SaaS Revenue & Billing</h1>
            <p className="page-sub">Monitor school wallets, set per-student pricing, and manage platform MRR.</p>

            {loading ? (
                <div className="flex justify-center" style={{ padding: 'var(--space-16)' }}>
                    <div className="spinner" />
                </div>
            ) : (
                <>
                    <div className="stats-grid mb-6">
                        <StatCard label="Platform MRR" value={formatCurrency(currentMRR)} icon={TrendingUp} color="success" />
                        <StatCard label="Wallet Liabilities" value={formatCurrency(totalWalletBalance)} icon={Wallet} color="primary" />
                        <StatCard label="Warning / Suspended" value={atRiskSchools.length} icon={AlertTriangle} color="danger" />
                    </div>

                    <div className="table-container">
                        <div className="table-toolbar">
                            <h2 className="text-lg font-bold">School Wallets & SaaS Metering</h2>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-sm" onClick={loadData}>
                                    <RefreshCw size={14} /> Sync
                                </button>
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>School Name</th>
                                        <th>Bill Status</th>
                                        <th>Rate</th>
                                        <th>Active Students</th>
                                        <th>Projected /30d</th>
                                        <th>Next Billing</th>
                                        <th>Wallet Balance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schools.map(s => {
                                        const projected = Number(s.perStudentRate || 50) * (s.activeStudentCount || 0);
                                        const isLow = s.walletBalance < projected;
                                        return (
                                            <tr key={s.schoolId}>
                                                <td>
                                                    <span className="font-bold">{s.schoolName}</span>
                                                    <div className="text-xs text-tertiary">{s.schoolId}</div>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${s.billingStatus || 'active'} uppercase`}>
                                                        {s.billingStatus === 'suspended' ? <Ban size={10} /> : s.billingStatus === 'warning' ? <Clock size={10} /> : <CheckCircle size={10} />}
                                                        {s.billingStatus || 'active'}
                                                    </span>
                                                </td>
                                                <td className="text-sm">{formatCurrency(Number(s.perStudentRate || 50))}</td>
                                                <td className="text-center font-bold">{s.activeStudentCount || 0}</td>
                                                <td className="font-extrabold text-primary">{formatCurrency(projected)}</td>
                                                <td className="text-sm text-secondary">{getNextBilling(s.lastBillingDate)}</td>
                                                <td>
                                                    <span className={`${isLow ? 'text-danger' : 'text-success'} font-bold`}>
                                                        ₹{Number(s.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    {isLow && <AlertTriangle size={12} className="text-danger" />}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-primary btn-xs"
                                                            onClick={() => {
                                                                setRefundSchool(s)
                                                                setRefundForm({ amount: '', description: 'Manual Adjustment' })
                                                                setShowRefundModal(true)
                                                            }}
                                                        >
                                                            <PlusCircle size={12} /> Adjust
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-xs"
                                                            onClick={() => handleViewLedger(s)}
                                                        >
                                                            <History size={12} /> History
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-xs"
                                                            onClick={() => {
                                                                setManageSchool(s)
                                                                setManageForm({ perStudentRate: s.perStudentRate || 50, applyToAll: false })
                                                                setShowManageModal(true)
                                                            }}
                                                        >
                                                            Configure
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {schools.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="table-empty">No schools found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="table-container mt-6">
                        <div className="table-toolbar">
                            <h2 className="text-lg font-bold">Revenue Generation & Promos</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowPromoModal(true)}>+ Create Promo</button>
                        </div>

                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Credit Amount</th>
                                        <th>Trial Days</th>
                                        <th>Uses (Current / Max)</th>
                                        <th>Created Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promos.map(p => (
                                        <tr key={p.id}>
                                            <td className="font-bold text-primary uppercase letter-spaced">{p.code}</td>
                                            <td>{formatCurrency(Number(p.creditAmount || 0))}</td>
                                            <td>{p.freeDays} days</td>
                                            <td>{p.currentUses} / {p.maxUses}</td>
                                            <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {promos.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="table-empty">No promo codes available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)} title="Create Promo Code">
                        <form onSubmit={handleCreatePromo}>
                            <div className="form-group">
                                <label className="form-label">Promo Code Name</label>
                                <input
                                    type="text"
                                    value={promoForm.code}
                                    onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. WELCOME5000"
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Credit Amount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={promoForm.creditAmount}
                                    onChange={e => setPromoForm({ ...promoForm, creditAmount: e.target.value })}
                                    placeholder="5000"
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 mb-6">
                                <div className="form-group flex-1">
                                    <label className="form-label">Free Days</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={promoForm.freeDays}
                                        onChange={e => setPromoForm({ ...promoForm, freeDays: parseInt(e.target.value) || 0 })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Max Uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={promoForm.maxUses}
                                        onChange={e => setPromoForm({ ...promoForm, maxUses: parseInt(e.target.value) || 1 })}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {promoError && (
                                <div className="alert-inline alert-inline-danger mb-4">{promoError}</div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPromoModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={promoSubmitting}>
                                    {promoSubmitting ? 'Creating...' : 'Create Promo Code'}
                                </button>
                            </div>
                        </form>
                    </Modal>

                    <Modal open={showManageModal && !!manageSchool} onClose={() => setShowManageModal(false)} title={`Manage Billing for ${manageSchool?.schoolName || ''}`}>
                        <form onSubmit={handleManageSubmit}>
                            <div className="form-group">
                                <label className="form-label">Per Student Rate (₹) / month</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={manageForm.perStudentRate}
                                    onChange={e => setManageForm({ ...manageForm, perStudentRate: e.target.value })}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="applyToAll"
                                    checked={manageForm.applyToAll}
                                    onChange={e => setManageForm({ ...manageForm, applyToAll: e.target.checked })}
                                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                />
                                <label htmlFor="applyToAll" className="text-md" style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Apply this rate to <strong>all schools</strong> across the platform
                                </label>
                            </div>

                            {manageError && (
                                <div className="alert-inline alert-inline-danger mb-4">{manageError}</div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowManageModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={manageSubmitting}>
                                    {manageSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </Modal>

                    <Modal open={showRefundModal && !!refundSchool} onClose={() => setShowRefundModal(false)} title={`Adjust Wallet: ${refundSchool?.schoolName || ''}`}>
                        <form onSubmit={handleRefundSubmit}>
                            <div className="form-group">
                                <label className="form-label">Adjustment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={refundForm.amount}
                                    onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })}
                                    placeholder="e.g. 500 for refund, -500 for charge"
                                    className="form-input"
                                    required
                                />
                                <p className="form-hint">Positive values add credit. Negative values subtract credit.</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description / Reason</label>
                                <textarea
                                    value={refundForm.description}
                                    onChange={e => setRefundForm({ ...refundForm, description: e.target.value })}
                                    className="form-textarea"
                                    required
                                />
                            </div>

                            {refundError && (
                                <div className="alert-inline alert-inline-danger mb-4">{refundError}</div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRefundModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={refundSubmitting}>
                                    {refundSubmitting ? 'Processing...' : 'Apply Adjustment'}
                                </button>
                            </div>
                        </form>
                    </Modal>

                    <Modal open={showLedgerModal && !!ledgerSchool} onClose={() => setShowLedgerModal(false)} title={`Wallet History: ${ledgerSchool?.schoolName || ''}`} wide>
                        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {ledgerLoading ? (
                                <div className="flex justify-center" style={{ padding: 'var(--space-10)' }}>
                                    <div className="spinner" />
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerData.map(entry => (
                                            <tr key={entry.id}>
                                                <td className="text-sm">{new Date(entry.createdAt).toLocaleString()}</td>
                                                <td>
                                                    <StatusBadge
                                                        status={entry.type === 'REFUND' || entry.type === 'CREDIT' ? 'active' : 'blocked'}
                                                        label={entry.type}
                                                    />
                                                </td>
                                                <td className="text-sm">{entry.description}</td>
                                                <td className={`font-bold ${Number(entry.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {Number(entry.amount) >= 0 ? '+' : ''}{formatCurrency(Number(entry.amount))}
                                                </td>
                                                <td className="font-bold">{formatCurrency(Number(entry.balanceAfter))}</td>
                                            </tr>
                                        ))}
                                        {ledgerData.length === 0 && (
                                            <tr><td colSpan="5" className="table-empty">No records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Modal>
                </>
            )}
        </motion.div>
    )
}
