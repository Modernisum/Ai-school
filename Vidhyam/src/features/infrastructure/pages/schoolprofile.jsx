import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    Building2, MapPin, Shield, CheckCircle, AlertTriangle,
    TrendingUp, Plus, X, Calendar, Pencil, Phone, CreditCard,
    User, LogOut, Loader2 as Loader, Save, Globe, Mail, Landmark,
    Code, Key, Trash2, Eye, EyeOff, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { selectSchoolId, updateProfile, logout as logoutAction } from '../../auth/authSlice';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { 
    useGetSchoolProfileQuery, 
    useUpdateSchoolProfileMutation 
} from '../infrastructureApi';

const CLASS_LEVELS = [
    { label: "Primary (Up to Class 5)", value: 5 },
    { label: "Junior (Up to Class 8)", value: 8 },
    { label: "High School (Up to Class 10)", value: 10 },
    { label: "Intermediate (Up to Class 12)", value: 12 },
];
const BOARDS = ["CBSE", "ICSE", "State Board (UP)", "State Board (MP)", "State Board (Rajasthan)", "State Board (Maharashtra)", "State Board (Bihar)", "NIOS", "IB", "Cambridge (IGCSE)"];
const MEDIUMS = ["Hindi Medium", "English Medium", "Bilingual (Hindi + English)", "Urdu Medium", "Other"];

export default function AccountPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const schoolId = getSchoolId();
    
    // RTK Query hooks
    const pollingInterval = useSelector(selectPollingInterval);
    const { data: profileData, isLoading, isFetching, refetch } = useGetSchoolProfileQuery(schoolId, { pollingInterval });
    const [updateSchoolProfile, { isLoading: isUpdating }] = useUpdateSchoolProfileMutation();

    const [editSection, setEditSection] = useState(null);
    const [toast, setToast] = useState(null);
    const [draft, setDraft] = useState({});

    // Developer Portal State
    const [apiKeys, setApiKeys] = useState([]);
    const [keysLoading, setKeysLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [showKeyModal, setShowKeyModal] = useState(false);

    useEffect(() => {
        fetchApiKeys();
    }, [schoolId]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

    const fetchApiKeys = async () => {
        setKeysLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}/api-keys`);
            const data = await res.json();
            if (data.success) setApiKeys(data.api_keys || []);
        } catch { }
        finally { setKeysLoading(false); }
    };

    const handleCreateApiKey = async () => {
        if (!newKeyName.trim()) {
            showToast('error', 'Key name is required');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName, scopes: ["all"] })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedKey(data.api_key);
                setShowKeyModal(true);
                setNewKeyName('');
                fetchApiKeys();
                showToast('success', 'API Key Generated');
            } else throw new Error(data.message);
        } catch (e) {
            showToast('error', e.message || 'Failed to create key');
        }
    };

    const handleRevokeApiKey = async (keyId) => {
        if (!window.confirm('Revoke this key? Apps using it will immediately lose access.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}/api-keys/${keyId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchApiKeys();
                showToast('success', 'API Key Revoked');
            }
        } catch {
            showToast('error', 'Failed to revoke key');
        }
    };

    // When profileData is loaded or changed, update local data (conceptually, though we use draft for edits)
    const school = profileData?.data || profileData?.school || profileData || {};

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const startEdit = (section) => {
        setDraft({
            name: school.schoolName || school.name || '',
            principalName: school.principalName || '',
            sinceEstablished: school.sinceEstablished || school.establishedYear || '',
            directors: Array.isArray(school.directors) ? [...school.directors] : [],
            affiliatedBoard: school.affiliatedBoard || '',
            affiliationNumber: school.affiliationNumber || '',
            medium: school.medium || '',
            classLevel: school.classLevel ? String(school.classLevel) : '',
            address: school.address || school.schoolAddress || '',
            phone: school.phone || '',
            alternatePhone: school.alternatePhone || '',
            landline: school.landline || '',
            email: school.email || '',
        });
        setEditSection(section);
    };

    const cancelEdit = () => {
        setEditSection(null);
        setDraft({});
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...draft,
                classLevel: parseInt(draft.classLevel) || 0,
                directors: (draft.directors || []).filter(d => d.trim()),
                schoolName: draft.name // mapping back to backend field name if needed
            };
            
            await updateSchoolProfile({ schoolId, body: payload }).unwrap();
            
            // Re-sync Redux for legacy compatibility if needed
            dispatch(updateProfile({
                name: draft.name,
                address: draft.address,
                board: draft.affiliatedBoard,
                medium: draft.medium,
                maxClassLevel: draft.classLevel
            }));

            setEditSection(null);
            showToast('success', 'Profile updated successfully');
        } catch (e) {
            showToast('error', e.data?.message || 'Update failed');
        }
    };

    const handleSignOut = () => {
        dispatch(logoutAction());
        navigate("/");
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader size={40} className="animate-spin text-primary" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">Synchronizing Records...</p>
        </div>
    );

    const billingStatus = school.billingStatus || 'active';
    const walletBalance = parseFloat(school.walletBalance || '0').toFixed(2);

    return (
        <div className="min-h-full pb-12">
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                        <Building2 size={22} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white italic tracking-tighter uppercase italic">Institutional Profile</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Registry ID: {schoolId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className={`p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all ${isFetching ? 'animate-spin opacity-50' : ''}`}>
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={handleSignOut} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/5">
                        <LogOut size={14} /> De-Authenticate
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Billing Summary Bar */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-primary shadow-xl shadow-primary/5 hover:bg-white/[0.04] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Landmark size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trust Balance</p>
                            <p className="text-lg font-black text-white italic tracking-tight">₹{walletBalance}</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-success shadow-xl shadow-success/5 hover:bg-white/[0.04] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Credits</p>
                            <p className="text-lg font-black text-white italic tracking-tight">{school.studentCount || '0'} ALLOCATED</p>
                        </div>
                    </div>
                    <div className={`glass-card p-4 flex items-center gap-4 border-l-4 shadow-xl shadow-warning/5 hover:bg-white/[0.04] transition-all ${billingStatus === 'suspended' ? 'border-l-accent' : 'border-l-warning'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${billingStatus === 'suspended' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Status</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-lg font-black italic tracking-tight uppercase ${billingStatus === 'suspended' ? 'text-accent' : 'text-warning'}`}>{billingStatus}</p>
                                {billingStatus !== 'active' && <AlertTriangle size={14} className="text-warning animate-pulse" />}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Identity Section */}
                    <ProfileSection 
                        title="Identity & Hierarchy" 
                        icon={<Building2 size={16} />}
                        isEditing={editSection === 'identity'}
                        onEdit={() => startEdit('identity')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        saving={isUpdating}
                    >
                        {editSection === 'identity' ? (
                            <div className="space-y-4 pt-2">
                                <InputField label="OFFICIAL NAME" value={draft.name} onChange={v => setDraft(p => ({ ...p, name: v }))} />
                                <InputField label="PRINCIPAL / HOD" value={draft.principalName} onChange={v => setDraft(p => ({ ...p, principalName: v }))} />
                                <InputField label="ESTABLISHMENT YEAR" type="number" value={draft.sinceEstablished} onChange={v => setDraft(p => ({ ...p, sinceEstablished: v }))} />
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                <DataRow label="Institutional Name" value={school.schoolName || school.name} />
                                <DataRow label="Leadership" value={school.principalName} />
                                <DataRow label="Established" value={school.sinceEstablished || school.establishedYear} />
                                <DataRow label="Directors" value={school.directors?.join(', ') || 'NONE DECLARED'} />
                            </div>
                        )}
                    </ProfileSection>

                    {/* Academic Section */}
                    <ProfileSection 
                        title="Academic Manifest" 
                        icon={<TrendingUp size={16} />}
                        isEditing={editSection === 'academic'}
                        onEdit={() => startEdit('academic')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        saving={isUpdating}
                    >
                        {editSection === 'academic' ? (
                            <div className="space-y-4 pt-2">
                                <SelectField label="AFFILIATION BOARD" value={draft.affiliatedBoard} options={BOARDS.map(b => ({ label: b, value: b }))} onChange={v => setDraft(p => ({ ...p, affiliatedBoard: v }))} />
                                <InputField label="AFFILIATION NUMBER" value={draft.affiliationNumber} onChange={v => setDraft(p => ({ ...p, affiliationNumber: v }))} />
                                <SelectField label="INSTRUCTION MEDIUM" value={draft.medium} options={MEDIUMS.map(m => ({ label: m, value: m }))} onChange={v => setDraft(p => ({ ...p, medium: v }))} />
                                <SelectField label="CLASS SPECTRUM" value={draft.classLevel} options={CLASS_LEVELS} onChange={v => setDraft(p => ({ ...p, classLevel: v }))} />
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                <DataRow label="Board" value={school.affiliatedBoard} />
                                <DataRow label="Certification ID" value={school.affiliationNumber} />
                                <DataRow label="Medium" value={school.medium} />
                                <DataRow label="Level" value={CLASS_LEVELS.find(l => String(l.value) === String(school.classLevel))?.label || school.classLevel} />
                            </div>
                        )}
                    </ProfileSection>

                    {/* Contact Section */}
                    <ProfileSection 
                        title="Communication Hub" 
                        icon={<Phone size={16} />}
                        isEditing={editSection === 'contact'}
                        onEdit={() => startEdit('contact')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        saving={isUpdating}
                    >
                        {editSection === 'contact' ? (
                            <div className="space-y-4 pt-2">
                                <InputField label="PRIMARY CONTACT" value={draft.phone} onChange={v => setDraft(p => ({ ...p, phone: v }))} />
                                <InputField label="SUPPORT EMAIL" value={draft.email} onChange={v => setDraft(p => ({ ...p, email: v }))} />
                                <InputField label="PHYSICAL LOCUS" type="textarea" value={draft.address} onChange={v => setDraft(p => ({ ...p, address: v }))} />
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                <DataRow label="Contact Line" value={school.phone} />
                                <DataRow label="Digital Mail" value={school.email} />
                                <DataRow label="Address" value={school.address || school.schoolAddress} />
                            </div>
                        )}
                    </ProfileSection>

                    {/* Security Section */}
                    <ProfileSection 
                        title="Security Protocols" 
                        icon={<Shield size={16} />}
                        isEditing={editSection === 'security'}
                        onEdit={() => startEdit('security')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        saving={isUpdating}
                    >
                        <div className="divide-y divide-white/[0.04]">
                            <DataRow label="Access Credentials" value="••••••••" />
                            <DataRow label="School Identifier" value={<span className="font-mono text-warning/80">{schoolId}</span>} />
                            <DataRow label="Audit Trail" value="LAST SIGN-IN FROM 192.168.1.1" />
                        </div>
                    </ProfileSection>

                    {/* Developer Portal Section */}
                    <ProfileSection 
                        title="Developer Portal" 
                        icon={<Code size={16} />}
                        isEditing={editSection === 'developer'}
                        onEdit={() => startEdit('developer')}
                        onCancel={cancelEdit}
                        onSave={() => setEditSection(null)}
                        saving={false}
                        customEditButtonLabel="Manage Keys"
                    >
                        {editSection === 'developer' ? (
                            <div className="space-y-4 pt-2">
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                                    <p className="text-xs text-primary font-bold uppercase tracking-widest">Generate New Key</p>
                                    <div className="flex gap-2">
                                        <input className="input-dark flex-1 py-2 text-sm" placeholder="App Name (e.g. Tally Integration)"
                                            value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                                        <button onClick={handleCreateApiKey} className="btn-primary px-4 py-2 text-xs">Generate</button>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {keysLoading ? <Loader size={16} className="animate-spin text-slate-500 mx-auto" /> : apiKeys.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic text-center py-4">No API keys found.</p>
                                    ) : apiKeys.map(k => (
                                        <div key={k.id} className="flex items-center justify-between p-3 bg-slate-800/50 border border-white/5 rounded-xl">
                                            <div>
                                                <p className="text-sm font-bold text-white">{k.name} <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${k.status === 'active' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}`}>{k.status}</span></p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {k.key_id}</p>
                                            </div>
                                            {k.status === 'active' && (
                                                <button onClick={() => handleRevokeApiKey(k.key_id)} className="text-accent hover:brightness-110 p-2 hover:bg-accent/10 rounded-lg">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                <DataRow label="Active Integrations" value={`${apiKeys.filter(k => k.status === 'active').length} App(s) Connected`} />
                                <DataRow label="Webhooks" value="Coming Soon" />
                                <DataRow label="API Status" value={<span className="text-success font-bold">Operational</span>} />
                            </div>
                        )}
                    </ProfileSection>
                </div>
            </div>

            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black tracking-widest shadow-2xl backdrop-blur-md border uppercase
                        ${toast.type === 'success' ? 'bg-success/20 border-success/30 text-success' : 'bg-accent/20 border-accent/30 text-accent'}`}>
                        {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generated API Key Modal */}
            <AnimatePresence>
                {showKeyModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowKeyModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-slate-900 border border-primary/30 w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
                            <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                                <Key size={24} />
                            </div>
                            <h2 className="text-lg font-black text-white text-center mb-2 uppercase tracking-wide">Developer Key Generated</h2>
                            <p className="text-xs text-accent text-center font-bold mb-6 bg-accent/10 p-2 rounded-lg">Copy this key now. You won't be able to see it again!</p>
                            
                            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 p-3 rounded-xl mb-6 group relative">
                                <code className="text-sm font-mono text-primary break-all flex-1 select-all">{generatedKey}</code>
                                <button onClick={() => { navigator.clipboard.writeText(generatedKey); showToast('success', 'Copied to clipboard!'); }} 
                                    className="p-2 bg-primary/20 text-primary hover:bg-primary/40 rounded-lg transition-colors absolute right-2 opacity-0 group-hover:opacity-100">
                                    <Copy size={16} />
                                </button>
                            </div>

                            <button onClick={() => setShowKeyModal(false)} className="w-full btn-primary py-3">I have copied my key</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Internal Helper Components ---

function ProfileSection({ title, icon, isEditing, onEdit, onCancel, onSave, saving, customEditButtonLabel, children }) {
    return (
        <motion.div 
            layout
            className={`glass-card overflow-hidden transition-all duration-300 ${isEditing ? 'ring-2 ring-warning/30 shadow-2xl shadow-warning/10 scale-[1.02]' : ''}`}
        >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2.5 text-xs font-black text-slate-300 uppercase tracking-widest italic">
                    <span className="text-warning">{icon}</span>
                    {title}
                </div>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        {customEditButtonLabel ? (
                            <button onClick={onSave} disabled={saving} className="text-[10px] font-black text-slate-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all uppercase tracking-widest bg-white/5">
                                Done
                            </button>
                        ) : (
                            <>
                                <button onClick={onCancel} className="text-[10px] font-black text-slate-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all uppercase tracking-widest">
                                    Abort
                                </button>
                                <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 text-[10px] font-black px-4 py-1.5 rounded-lg bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 transition-all uppercase tracking-widest shadow-lg shadow-warning/5">
                                    {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                                    Commit
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <button onClick={onEdit} className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all uppercase tracking-widest border border-transparent hover:border-white/10">
                        {customEditButtonLabel ? <Settings size={11} className="mr-0.5" /> : <Pencil size={11} />} {customEditButtonLabel || 'Modify'}
                    </button>
                )}
            </div>
            <div className="p-6">{children}</div>
        </motion.div>
    );
}

function DataRow({ label, value }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center py-3.5 gap-2 sm:gap-6 group">
            <span className="text-[10px] text-slate-600 w-36 flex-shrink-0 font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">{label}</span>
            <span className="text-sm text-slate-300 font-bold group-hover:text-white transition-colors truncate">{value || 'NOT SPECIFIED'}</span>
        </div>
    );
}

function InputField({ label, value, onChange, type = 'text' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">{label}</label>
            {type === 'textarea' ? (
                <textarea className="input-dark w-full min-h-[80px] py-3 text-sm font-bold" value={value} onChange={e => onChange(e.target.value)} />
            ) : (
                <input type={type} className="input-dark w-full py-3 text-sm font-bold" value={value} onChange={e => onChange(e.target.value)} />
            )}
        </div>
    );
}

function SelectField({ label, value, options, onChange }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">{label}</label>
            <select className="input-dark w-full py-3 text-sm font-bold" value={value} onChange={e => onChange(e.target.value)}>
                <option value="">-- SELECT --</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>)}
            </select>
        </div>
    );
}

const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return "622079";
};

import { RefreshCw, Settings } from 'lucide-react';

