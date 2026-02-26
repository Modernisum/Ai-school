import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, Shield, CheckCircle, AlertTriangle,
    Loader, Save, Key, User, LogOut, Hash, Globe,
    TrendingUp, Plus, X, Calendar, Pencil, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

const CLASS_LEVELS = [
    { label: "Primary (Up to Class 5)", value: 5 },
    { label: "Junior (Up to Class 8)", value: 8 },
    { label: "High School (Up to Class 10)", value: 10 },
    { label: "Intermediate (Up to Class 12)", value: 12 },
];
const BOARDS = ["CBSE", "ICSE", "State Board (UP)", "State Board (MP)", "State Board (Rajasthan)", "State Board (Maharashtra)", "State Board (Bihar)", "NIOS", "IB", "Cambridge (IGCSE)"];
const MEDIUMS = ["Hindi Medium", "English Medium", "Bilingual (Hindi + English)", "Urdu Medium", "Other"];

// Which section is being edited — null means read-only
const SECTIONS = ['identity', 'academic', 'contact', 'security'];

export default function AccountPage() {
    const navigate = useNavigate();
    const schoolId = localStorage.getItem('schoolId') || '';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editSection, setEditSection] = useState(null);  // null = read-only
    const [toast, setToast] = useState(null);

    const [data, setData] = useState({
        name: '',
        principalName: '',
        sinceEstablished: '',
        directors: [],
        affiliatedBoard: '',
        affiliationNumber: '',
        medium: '',
        classLevel: '',
        address: '',
        phone: '',
        alternatePhone: '',
        landline: '',
        email: '',
    });

    // Local draft used only while editing
    const [draft, setDraft] = useState({});
    const [passwordDraft, setPasswordDraft] = useState({ newPassword: '', confirmPassword: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}`);
            const json = await res.json();
            const s = json.data || json.school || json || {};

            setData({
                name: s.schoolName || s.name || '',
                principalName: s.principalName || '',
                sinceEstablished: s.sinceEstablished || s.establishedYear || '',
                directors: Array.isArray(s.directors) && s.directors.length ? s.directors : [],
                affiliatedBoard: s.affiliatedBoard || '',
                affiliationNumber: s.affiliationNumber || '',
                medium: s.medium || '',
                classLevel: s.classLevel ? String(s.classLevel) : '',
                address: s.address || s.schoolAddress || '',
                phone: s.phone || '',
                alternatePhone: s.alternatePhone || '',
                landline: s.landline || '',
                email: s.email || '',
            });
        } catch (e) {
            console.warn('Fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const startEdit = (section) => {
        setDraft({ ...data }); // copy current data into draft
        setEditSection(section);
    };

    const cancelEdit = () => {
        setEditSection(null);
        setDraft({});
    };

    const saveSection = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            const payload = {
                schoolName: draft.name,
                principalName: draft.principalName,
                sinceEstablished: draft.sinceEstablished,
                directors: (draft.directors || []).filter(d => d.trim()),
                affiliatedBoard: draft.affiliatedBoard,
                affiliationNumber: draft.affiliationNumber,
                medium: draft.medium,
                classLevel: parseInt(draft.classLevel) || 0,
                address: draft.address,
                phone: draft.phone,
                alternatePhone: draft.alternatePhone,
                landline: draft.landline,
                email: draft.email,
            };
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }
            setData({ ...draft });
            setEditSection(null);
            showToast('success', 'Account updated successfully');
        } catch (e) {
            showToast('error', `Failed to save: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const savePassword = async () => {
        if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
            return showToast('error', 'Passwords do not match');
        }
        if (passwordDraft.newPassword.length < 6) {
            return showToast('error', 'Min. 6 characters required');
        }
        setSaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newPassword: passwordDraft.newPassword }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setPasswordDraft({ newPassword: '', confirmPassword: '' });
            setEditSection(null);
            showToast('success', 'Password changed successfully');
        } catch (e) {
            showToast('error', `Failed: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const classLevelLabel = CLASS_LEVELS.find(l => l.value === parseInt(data.classLevel))?.label || data.classLevel || '—';
    const d = (v) => v || <span className="text-slate-600">—</span>;

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <User size={18} className="text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Account</h1>
                        <p className="text-xs text-slate-500">Manage institution details &amp; security</p>
                    </div>
                </div>
                <button
                    onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('schoolId'); navigate('/'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-semibold transition-all"
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>

            <div className="p-6 max-w-2xl mx-auto space-y-4">
                {loading ? (
                    <div className="flex justify-center py-24"><Loader size={28} className="animate-spin text-orange-400" /></div>
                ) : (
                    <>
                        {/* ─── Identity Section ─── */}
                        <Section
                            title="Institution Identity"
                            icon={<Building2 size={15} />}
                            isEditing={editSection === 'identity'}
                            onEdit={() => startEdit('identity')}
                            onCancel={cancelEdit}
                            onSave={saveSection}
                            saving={saving}
                        >
                            {editSection === 'identity' ? (
                                <div className="space-y-3 pt-1">
                                    <Field label="School Name">
                                        <input className="input-dark w-full" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
                                    </Field>
                                    <Field label="Principal Name">
                                        <input className="input-dark w-full" placeholder="e.g. Dr. A.P. Sharma" value={draft.principalName} onChange={e => setDraft(p => ({ ...p, principalName: e.target.value }))} />
                                    </Field>
                                    <Field label="Since Established">
                                        <input type="number" className="input-dark w-full" placeholder="e.g. 1998" value={draft.sinceEstablished} onChange={e => setDraft(p => ({ ...p, sinceEstablished: e.target.value }))} />
                                    </Field>
                                    <Field label="Directors">
                                        <div className="space-y-2">
                                            {(draft.directors?.length ? draft.directors : ['']).map((dir, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input className="input-dark flex-1 text-sm" placeholder={`Director ${i + 1}`} value={dir} onChange={e => {
                                                        const arr = [...(draft.directors || [''])];
                                                        arr[i] = e.target.value;
                                                        setDraft(p => ({ ...p, directors: arr }));
                                                    }} />
                                                    {(draft.directors?.length > 1) && (
                                                        <button onClick={() => setDraft(p => ({ ...p, directors: p.directors.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"><X size={13} /></button>
                                                    )}
                                                </div>
                                            ))}
                                            {(draft.directors?.length || 0) < 5 && (
                                                <button onClick={() => setDraft(p => ({ ...p, directors: [...(p.directors || []), ''] }))} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium mt-1"><Plus size={12} /> Add Director</button>
                                            )}
                                        </div>
                                    </Field>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    <Row label="School Name" value={d(data.name)} />
                                    <Row label="Principal" value={d(data.principalName)} />
                                    <Row label="Established" value={d(data.sinceEstablished)} />
                                    <Row label="Director(s)" value={
                                        data.directors.length
                                            ? <span>{data.directors.join(', ')}</span>
                                            : <span className="text-slate-600">—</span>
                                    } />
                                </div>
                            )}
                        </Section>

                        {/* ─── Academic Section ─── */}
                        <Section
                            title="Academic Structure"
                            icon={<TrendingUp size={15} />}
                            isEditing={editSection === 'academic'}
                            onEdit={() => startEdit('academic')}
                            onCancel={cancelEdit}
                            onSave={saveSection}
                            saving={saving}
                        >
                            {editSection === 'academic' ? (
                                <div className="space-y-3 pt-1">
                                    <Field label="Affiliated Board">
                                        <select className="input-dark w-full" value={draft.affiliatedBoard} onChange={e => setDraft(p => ({ ...p, affiliatedBoard: e.target.value }))}>
                                            <option value="">Select Board</option>
                                            {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Affiliation No.">
                                        <input className="input-dark w-full" placeholder="e.g. 2110001" value={draft.affiliationNumber} onChange={e => setDraft(p => ({ ...p, affiliationNumber: e.target.value }))} />
                                    </Field>
                                    <Field label="Medium">
                                        <select className="input-dark w-full" value={draft.medium} onChange={e => setDraft(p => ({ ...p, medium: e.target.value }))}>
                                            <option value="">Select Medium</option>
                                            {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Class Level">
                                        <select className="input-dark w-full" value={draft.classLevel} onChange={e => setDraft(p => ({ ...p, classLevel: e.target.value }))}>
                                            <option value="">Select Level</option>
                                            {CLASS_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                        </select>
                                    </Field>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    <Row label="Board" value={d(data.affiliatedBoard)} />
                                    <Row label="Affiliation No." value={d(data.affiliationNumber)} />
                                    <Row label="Medium" value={d(data.medium)} />
                                    <Row label="Class Level" value={d(classLevelLabel)} />
                                </div>
                            )}
                        </Section>

                        {/* ─── Contact Section ─── */}
                        <Section
                            title="Contact & Address"
                            icon={<Phone size={15} />}
                            isEditing={editSection === 'contact'}
                            onEdit={() => startEdit('contact')}
                            onCancel={cancelEdit}
                            onSave={saveSection}
                            saving={saving}
                        >
                            {editSection === 'contact' ? (
                                <div className="space-y-3 pt-1">
                                    <Field label="Contact Number">
                                        <input className="input-dark w-full" placeholder="+91 XXXXX XXXXX" value={draft.phone} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} />
                                    </Field>
                                    <Field label="Alternative Number">
                                        <input className="input-dark w-full" placeholder="+91 XXXXX XXXXX" value={draft.alternatePhone} onChange={e => setDraft(p => ({ ...p, alternatePhone: e.target.value }))} />
                                    </Field>
                                    <Field label="Landline">
                                        <input className="input-dark w-full" placeholder="e.g. 0522-2345678" value={draft.landline} onChange={e => setDraft(p => ({ ...p, landline: e.target.value }))} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" className="input-dark w-full" placeholder="info@school.edu" value={draft.email} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
                                    </Field>
                                    <Field label="Address">
                                        <textarea className="input-dark w-full resize-none py-2" rows={3} placeholder="Full address with city and pincode" value={draft.address} onChange={e => setDraft(p => ({ ...p, address: e.target.value }))} />
                                    </Field>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    <Row label="Contact" value={d(data.phone)} />
                                    <Row label="Alternative" value={d(data.alternatePhone)} />
                                    <Row label="Landline" value={d(data.landline)} />
                                    <Row label="Email" value={d(data.email)} />
                                    <Row label="Address" value={d(data.address)} />
                                </div>
                            )}
                        </Section>

                        {/* ─── Security Section ─── */}
                        <Section
                            title="Security"
                            icon={<Shield size={15} />}
                            isEditing={editSection === 'security'}
                            onEdit={() => { setPasswordDraft({ newPassword: '', confirmPassword: '' }); setEditSection('security'); }}
                            onCancel={cancelEdit}
                            onSave={savePassword}
                            saving={saving}
                        >
                            {editSection === 'security' ? (
                                <div className="space-y-3 pt-1">
                                    <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex gap-2 items-center">
                                        <AlertTriangle size={13} /> Password change will require you to log in again on all devices.
                                    </p>
                                    <Field label="New Password">
                                        <input type="password" className="input-dark w-full" placeholder="Min. 6 characters" value={passwordDraft.newPassword} onChange={e => setPasswordDraft(p => ({ ...p, newPassword: e.target.value }))} />
                                    </Field>
                                    <Field label="Confirm Password">
                                        <input type="password" className="input-dark w-full" placeholder="Repeat new password" value={passwordDraft.confirmPassword} onChange={e => setPasswordDraft(p => ({ ...p, confirmPassword: e.target.value }))} />
                                    </Field>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    <Row label="Password" value={<span className="text-slate-500 tracking-widest">••••••••</span>} />
                                    <Row label="School ID" value={<span className="font-mono text-xs text-slate-400">{schoolId}</span>} />
                                </div>
                            )}
                        </Section>
                    </>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, icon, isEditing, onEdit, onCancel, onSave, saving, children }) {
    return (
        <div className={`glass-card overflow-hidden transition-all duration-200 ${isEditing ? 'ring-1 ring-orange-500/30' : ''}`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <span className="text-orange-400">{icon}</span>
                    {title}
                </div>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all font-medium">
                            Cancel
                        </button>
                        <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 transition-all">
                            {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                            Save
                        </button>
                    </div>
                ) : (
                    <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                        <Pencil size={11} /> Edit
                    </button>
                )}
            </div>
            <div className="px-5 py-1">{children}</div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-start py-3 gap-4">
            <span className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-slate-200 flex-1 break-words">{value}</span>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="flex items-start gap-3">
            <label className="text-xs text-slate-500 w-32 flex-shrink-0 pt-3">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}
