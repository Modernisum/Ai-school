import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tag, Plus, X, Trash2, Shield, ShieldOff, CheckCircle,
    AlertTriangle, Loader, Percent, DollarSign, Users, User,
    RefreshCw, Search, Hash, Award
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => localStorage.getItem('schoolId') || "";
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
            const res = await fetch(`${API}/employees/${schoolId}`);
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
        <div className="max-w-full p-1 space-y-2 text-slate-400">
            {/* ─── Digital Header ─── */}
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Tag size={12} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">REFERRAL_PROTOCOL</h1>
                        <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                            NODES: {coupons.length} REGISTERED
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <StandardButton variant="ghost" size="xs" onClick={fetchCoupons} icon={RefreshCw} className={loading ? 'animate-spin' : ''} />
                    <StandardButton variant="primary" size="xs" onClick={() => setShowCreate(true)} icon={Plus}>INITIALIZE</StandardButton>
                </div>
            </header>

            {/* ─── OPERATIONAL VIEWPORT ─── */}
            <div className="space-y-1">
                <div className="relative group max-w-xs">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
                    <input 
                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-blue-500/20 transition-all font-black uppercase tracking-widest"
                        placeholder="SCAN_HASH..." value={search} onChange={e => setSearch(e.target.value)} 
                    />
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><RefreshCw size={16} className="animate-spin text-slate-800" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center glass-card border-dashed">
                        <Tag size={24} className="mx-auto mb-2 text-slate-800" />
                        <p className="text-micro font-black text-slate-700 uppercase tracking-widest">ZERO_NODES_FOUND</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                        {filtered.map((c, i) => (
                            <GlassCard key={i} delay={i * 0.01} className="p-1.5 border border-white/5 bg-white/[0.01]" dense hover>
                                <div className="flex items-start justify-between mb-1">
                                    <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-400"><Tag size={10} /></div>
                                    <div className={`px-1 py-0 rounded text-[6px] font-black uppercase tracking-widest border ${c.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                        {c.status}
                                    </div>
                                </div>
                                <h3 className="text-[9px] font-black text-white italic truncate uppercase leading-none mt-0.5">{c.couponName}</h3>
                                <div className="mt-2 space-y-0.5">
                                    <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest">
                                        <span className="text-slate-800">VALUE</span>
                                        <span className="text-violet-400">{c.discountType === 'percentage' ? `${c.discountValue}%` : fmt(c.discountValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest">
                                        <span className="text-slate-800">LOAD</span>
                                        <span className="text-indigo-400">{c.currentUses}/{c.maxUses || '∞'}</span>
                                    </div>
                                </div>
                                
                                {c.assignedEmployeeId && (
                                    <div className="mt-1 pt-1 border-t border-white/5 space-y-0.5">
                                        <div className="flex justify-between items-center text-[6px] font-black uppercase tracking-widest truncate">
                                            <span className="text-slate-700">LINK: {getEmpName(c.assignedEmployeeId)}</span>
                                            <span className="text-amber-500 ml-1">+{fmt(c.employeeReward)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto pt-1 flex gap-0.5">
                                    <StandardButton variant="ghost" size="xs" onClick={() => toggleBlock(c)} icon={c.status === 'active' ? ShieldOff : Shield} className="flex-1 !h-4 py-0" />
                                    <StandardButton variant="ghost" size="xs" onClick={() => deleteCoupon(c.couponId)} icon={Trash2} className="flex-1 !h-4 py-0 text-rose-500" />
                                </div>
                            </GlassCard>
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
