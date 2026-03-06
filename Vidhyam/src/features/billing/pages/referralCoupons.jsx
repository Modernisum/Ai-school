import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tag, Plus, X, Trash2, Shield, ShieldOff, CheckCircle,
    AlertTriangle, Loader, Percent, DollarSign, Users, User,
    RefreshCw, Search, Hash, Award
} from 'lucide-react';

const API = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => localStorage.getItem('schoolId') || '622079';
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ReferralCoupons() {
    const schoolId = getSchoolId();
    const [coupons, setCoupons] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);

    const [form, setForm] = useState({
        couponName: '', discountType: 'percentage', discountValue: '',
        maxUses: '', assignedEmployeeId: '', employeeReward: '', description: ''
    });

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/fees/${schoolId}/coupons`);
            const data = await res.json();
            setCoupons(data.data || []);
        } catch { showToast('error', 'Failed to load coupons'); }
        finally { setLoading(false); }
    }, [schoolId]);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await fetch(`${API}/employee/${schoolId}/employees`);
            const data = await res.json();
            setEmployees(data.data || data.employees || []);
        } catch { }
    }, [schoolId]);

    useEffect(() => { fetchCoupons(); fetchEmployees(); }, [fetchCoupons, fetchEmployees]);

    const createCoupon = async () => {
        if (!form.couponName.trim() || !form.discountValue) return;
        try {
            const res = await fetch(`${API}/fees/${schoolId}/coupons`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    discountValue: parseFloat(form.discountValue),
                    maxUses: parseInt(form.maxUses) || 0,
                    employeeReward: parseFloat(form.employeeReward) || 0
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Coupon created!');
                setShowCreate(false);
                setForm({ couponName: '', discountType: 'percentage', discountValue: '', maxUses: '', assignedEmployeeId: '', employeeReward: '', description: '' });
                fetchCoupons();
            } else { showToast('error', data.message || 'Failed'); }
        } catch { showToast('error', 'Network error'); }
    };

    const deleteCoupon = async (id) => {
        try {
            await fetch(`${API}/fees/${schoolId}/coupons/${id}`, { method: 'DELETE' });
            showToast('success', 'Coupon deleted');
            fetchCoupons();
        } catch { showToast('error', 'Delete failed'); }
    };

    const toggleBlock = async (coupon) => {
        const blocked = coupon.status === 'active';
        try {
            await fetch(`${API}/fees/${schoolId}/coupons/${coupon.couponId}/block`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocked })
            });
            showToast('success', blocked ? 'Coupon blocked' : 'Coupon activated');
            fetchCoupons();
        } catch { showToast('error', 'Failed'); }
    };

    const filtered = coupons.filter(c =>
        c.couponName.toLowerCase().includes(search.toLowerCase())
    );

    const getEmpName = (id) => {
        if (!id) return null;
        const emp = employees.find(e => (e.employeeId || e.employee_id) === id);
        return emp ? (emp.name || emp.employeeName || id) : id;
    };

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Tag size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Referral Coupons</h1>
                        <p className="text-xs text-slate-500">{coupons.length} coupons created</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchCoupons} className="btn-secondary p-2"><RefreshCw size={15} /></button>
                    <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={15} /> Create Coupon</button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Search */}
                <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-dark pl-9 w-full" placeholder="Search coupons..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Coupon Cards */}
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-violet-400" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-14">
                        <Tag size={36} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">No referral coupons yet</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary mt-4"><Plus size={15} /> Create First Coupon</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((c, i) => (
                            <motion.div key={c.couponId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="glass-card p-5 hover-card group relative">
                                {/* Status badge */}
                                <div className="absolute top-4 right-4">
                                    <span className={`badge text-[10px] ${c.status === 'active' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' : 'bg-rose-500/15 border-rose-500/25 text-rose-400'}`}>
                                        {c.status === 'active' ? '● Active' : '● Blocked'}
                                    </span>
                                </div>

                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4 pr-16">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                                        <Tag size={18} className="text-violet-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white text-sm truncate">{c.couponName}</h3>
                                        {c.description && <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{c.description}</p>}
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-slate-800/50 rounded-lg px-2.5 py-2 border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Discount</p>
                                        <p className="text-sm font-bold text-violet-400 flex items-center gap-1">
                                            {c.discountType === 'percentage' ? <><Percent size={12} />{c.discountValue}%</> : <>{fmt(c.discountValue)}</>}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg px-2.5 py-2 border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Uses</p>
                                        <p className="text-sm font-bold text-indigo-400 flex items-center gap-1">
                                            <Hash size={12} />{c.currentUses}{c.maxUses > 0 ? `/${c.maxUses}` : '/∞'}
                                        </p>
                                    </div>
                                </div>

                                {/* Employee */}
                                {c.assignedEmployeeId && (
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-2">
                                        <Award size={13} className="text-amber-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-amber-300 font-medium">{getEmpName(c.assignedEmployeeId)}</span>
                                            <span className="text-slate-500 ml-1">• Reward: {fmt(c.employeeReward)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 mt-auto border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => toggleBlock(c)}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${c.status === 'active'
                                            ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                                            : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}>
                                        {c.status === 'active' ? <><ShieldOff size={12} /> Block</> : <><Shield size={12} /> Activate</>}
                                    </button>
                                    <button onClick={() => deleteCoupon(c.couponId)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create Coupon Modal ── */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-box max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-white flex items-center gap-2"><Tag size={16} className="text-violet-400" /> Create Referral Coupon</h3>
                                <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="section-label text-xs mb-1.5">Coupon Name *</label>
                                    <input className="input-dark" placeholder="e.g. SUMMER2026, REF100" value={form.couponName} onChange={e => setForm(f => ({ ...f, couponName: e.target.value.toUpperCase() }))} />
                                </div>

                                {/* Discount Type + Value */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Discount Type</label>
                                        <select className="input-dark" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                                            <option value="percentage">% of Total Fees</option>
                                            <option value="fixed">Fixed Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Discount Value *</label>
                                        <input type="number" className="input-dark" placeholder={form.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                                            value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} />
                                    </div>
                                </div>

                                {/* Max Uses */}
                                <div>
                                    <label className="section-label text-xs mb-1.5">Max Uses (0 = unlimited)</label>
                                    <input type="number" className="input-dark" placeholder="0" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
                                </div>

                                {/* Employee Assignment */}
                                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-3">
                                    <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5"><Award size={13} /> Employee Commission</p>
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Assign Employee (optional)</label>
                                        <select className="input-dark" value={form.assignedEmployeeId} onChange={e => setForm(f => ({ ...f, assignedEmployeeId: e.target.value }))}>
                                            <option value="">None</option>
                                            {employees.map(e => (
                                                <option key={e.employeeId || e.employee_id} value={e.employeeId || e.employee_id}>
                                                    {e.name || e.employeeName} ({e.employeeId || e.employee_id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {form.assignedEmployeeId && (
                                        <div>
                                            <label className="section-label text-xs mb-1.5">Reward per Use (₹)</label>
                                            <input type="number" className="input-dark" placeholder="e.g. 200" value={form.employeeReward} onChange={e => setForm(f => ({ ...f, employeeReward: e.target.value }))} />
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="section-label text-xs mb-1.5">Description (optional)</label>
                                    <textarea className="input-dark h-16 resize-none" placeholder="Details about this coupon..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
                                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                                <button onClick={createCoupon} className="btn-primary px-6"><Tag size={14} /> Create Coupon</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
