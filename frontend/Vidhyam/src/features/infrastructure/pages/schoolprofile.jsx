import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    Building2, MapPin, Shield, CheckCircle, AlertTriangle,
    TrendingUp, Plus, X, Calendar, Pencil, Phone, CreditCard,
    User, LogOut, Loader2 as Loader, Save, Globe, Mail, Landmark,
    Code, Key, Trash2, Eye, EyeOff, Copy, RefreshCw, Upload, Settings,
    Activity, ShieldCheck, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { selectSchoolId, updateProfile, logout as logoutAction } from '../../auth/authSlice';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { 
    useGetSchoolProfileQuery, 
    useUpdateSchoolProfileMutation 
} from '../infrastructureApi';

import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import GlassCard from '../../../components/ui/GlassCard';
import StandardButton from '../../../components/ui/StandardButton';
import { ImageUploadField } from '../../../components/ui/StorageWidget';

const CLASS_LEVELS = [
    { label: "Primary (Up to Class 5)", value: 5 },
    { label: "Junior (Up to Class 8)", value: 8 },
    { label: "High School (Up to Class 10)", value: 10 },
    { label: "Intermediate (Up to Class 12)", value: 12 },
];
const BOARDS = ["CBSE", "ICSE", "State Board (UP)", "State Board (MP)", "State Board (Rajasthan)", "State Board (Maharashtra)", "State Board (Bihar)", "NIOS", "IB", "Cambridge (IGCSE)"];
const MEDIUMS = ["Hindi Medium", "English Medium", "Bilingual (Hindi + English)", "Urdu Medium", "Other"];

const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return "";
};

export default function AccountPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const schoolId = getSchoolId();
    
    // RTK Query hooks
    const pollingInterval = useSelector(selectPollingInterval);
    const { data: profileData, isLoading, isFetching, refetch } = useGetSchoolProfileQuery(schoolId, { pollingInterval });
    const [updateSchoolProfile, { isLoading: isUpdating }] = useUpdateSchoolProfileMutation();

    const [editSection, setEditSection] = useState(null);
    const [draft, setDraft] = useState({});

    // Developer Portal State
    const [apiKeys, setApiKeys] = useState([]);
    const [keysLoading, setKeysLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [showKeyModal, setShowKeyModal] = useState(false);

    // Photo/Logo State
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    useEffect(() => {
        if (schoolId) fetchApiKeys();
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
            toast.error('Protocol ID required for key generation');
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
                toast.success('API Access Protocol Established');
            } else throw new Error(data.message);
        } catch (e) {
            toast.error('Key generation failure');
        }
    };

    const handleRevokeApiKey = async (keyId) => {
        if (!window.confirm('Revoke this key? Apps using it will immediately lose access.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/school/${schoolId}/api-keys/${keyId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchApiKeys();
                toast.success('API Protocol Voided');
            }
        } catch {
            toast.error('Revocation failure');
        }
    };

    const school = profileData?.data || profileData?.school || profileData || {};

    // Logo Upload handler is now integrated into ImageUploadField

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
            schoolLogoUrl: school.schoolLogoUrl || '',
        });
        setEditSection(section);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...draft,
                classLevel: parseInt(draft.classLevel) || 0,
                directors: (draft.directors || []).filter(d => d.trim()),
                schoolName: draft.name
            };
            
            await updateSchoolProfile({ schoolId, body: payload }).unwrap();
            
            dispatch(updateProfile({
                name: draft.name,
                address: draft.address,
                board: draft.affiliatedBoard,
                medium: draft.medium,
                maxClassLevel: draft.classLevel
            }));

            setEditSection(null);
            toast.success('Institutional Manifold Updated');
        } catch (e) {
            toast.error('Commit failure');
        }
    };

    const handleSignOut = () => {
        dispatch(logoutAction());
        navigate("/");
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader size={40} className="animate-spin text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">SYNCHRONIZING RECENT MANIFEST...</p>
        </div>
    );

    const billingStatus = school.billingStatus || 'active';
    const walletBalance = parseFloat(school.walletBalance || '0').toFixed(2);

    return (
        <div className="max-w-full p-1 space-y-2 pb-10">
            <PageHeader
                title="INSTITUTIONAL"
                accentTitle="PROFILE"
                subtitle={`Registry ID: ${schoolId}`}
                icon={Building2}
                actions={[
                  { label: "REFRESH HUB", onClick: () => refetch(), icon: RefreshCw, variant: "ghost", className: isFetching ? 'animate-spin' : '' },
                  { label: "DE-AUTHENTICATE", onClick: handleSignOut, icon: LogOut, variant: "secondary", className: "text-rose-400 border-rose-500/30" }
                ]}
            />

            <KPIWidget columns={3} dense>
               <KPITile label="TRUST_BALANCE" value={`₹${walletBalance}`} sub="ALLOCATED_CREDITS" icon={Landmark} color="primary" />
               <KPITile label="ACTIVE_ENTITIES" value={school.studentCount || '0'} sub="LINKED_NODES" icon={TrendingUp} color="success" />
               <KPITile label="NEURAL_INTEGRITY" value={billingStatus.toUpperCase()} sub="SYSTEM_STATUS" icon={ShieldCheck} color={billingStatus === 'suspended' ? 'accent' : 'warning'} />
            </KPIWidget>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {/* Identity Card */}
                <GlassCard title="IDENTITY_&_HIERARCHY" icon={Building2} glowColor="primary" className="h-full" dense>
                    {editSection === 'identity' ? (
                        <div className="space-y-1">
                            <InputField label="OFFICIAL NAME" value={draft.name} onChange={v => setDraft(p => ({ ...p, name: v }))} />
                            <InputField label="LEADERSHIP IDENTIFIER" value={draft.principalName} onChange={v => setDraft(p => ({ ...p, principalName: v }))} />
                            <InputField label="ESTABLISHMENT NODE" type="number" value={draft.sinceEstablished} onChange={v => setDraft(p => ({ ...p, sinceEstablished: v }))} />
                            
                            <div className="pt-2">
                                <ImageUploadField 
                                    label="INSTITUTION_LOGO_PAYLOAD" 
                                    value={draft.schoolLogoUrl} 
                                    onChange={url => setDraft(p => ({ ...p, schoolLogoUrl: url }))} 
                                    fieldName="school_logo"
                                />
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <StandardButton label="COMMIT" icon={Save} onClick={handleSave} size="xs" className="flex-1" />
                                <StandardButton label="ABORT" variant="ghost" onClick={() => setEditSection(null)} size="xs" className="flex-1" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0 text-micro">
                            <DataEntry label="Registry Name" value={school.schoolName || school.name} />
                            <DataEntry label="Central Command" value={school.principalName} />
                            <DataEntry label="Locus Year" value={school.sinceEstablished || school.establishedYear} />
                            <div className="pt-2 border-t border-white/5">
                                <StandardButton label="MODIFY_MANIFOLD" icon={Pencil} variant="ghost" size="xs" onClick={() => startEdit('identity')} />
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Academic Card */}
                <GlassCard title="ACADEMIC_MANIFEST" icon={Zap} glowColor="accent" className="h-full" dense>
                    {editSection === 'academic' ? (
                        <div className="space-y-1">
                            <SelectField label="AFFILIATION BOARD" value={draft.affiliatedBoard} options={BOARDS.map(b => ({ label: b, value: b }))} onChange={v => setDraft(p => ({ ...p, affiliatedBoard: v }))} />
                            <InputField label="PROTOCOL IDENTIFIER" value={draft.affiliationNumber} onChange={v => setDraft(p => ({ ...p, affiliationNumber: v }))} />
                            <SelectField label="MEDIUM SPECTRUM" value={draft.medium} options={MEDIUMS.map(m => ({ label: m, value: m }))} onChange={v => setDraft(p => ({ ...p, medium: v }))} />
                            <SelectField label="NODE DEPTH" value={draft.classLevel} options={CLASS_LEVELS} onChange={v => setDraft(p => ({ ...p, classLevel: v }))} />
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <StandardButton label="COMMIT" icon={Save} onClick={handleSave} size="xs" className="flex-1" />
                                <StandardButton label="ABORT" variant="ghost" onClick={() => setEditSection(null)} size="xs" className="flex-1" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            <DataEntry label="Board Protocol" value={school.affiliatedBoard} />
                            <DataEntry label="Licensing ID" value={school.affiliationNumber} />
                            <DataEntry label="Language Array" value={school.medium} />
                            <DataEntry label="Sector Level" value={CLASS_LEVELS.find(l => String(l.value) === String(school.classLevel))?.label || school.classLevel} />
                            <div className="pt-2 border-t border-white/5">
                                <StandardButton label="UDPATE_SCHEMATIC" icon={Pencil} variant="ghost" size="xs" onClick={() => startEdit('academic')} />
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Communication Card */}
                <GlassCard title="NEURAL_LINKS" icon={Phone} glowColor="success" className="h-full" dense>
                    {editSection === 'contact' ? (
                        <div className="space-y-1">
                            <InputField label="PRIMARY LINK" value={draft.phone} onChange={v => setDraft(p => ({ ...p, phone: v }))} />
                            <InputField label="DIGITAL RELAY" value={draft.email} onChange={v => setDraft(p => ({ ...p, email: v }))} />
                            <InputField label="PHYSICAL LOCUS" type="textarea" value={draft.address} onChange={v => setDraft(p => ({ ...p, address: v }))} />
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <StandardButton label="COMMIT" icon={Save} onClick={handleSave} size="xs" className="flex-1" />
                                <StandardButton label="ABORT" variant="ghost" onClick={() => setEditSection(null)} size="xs" className="flex-1" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            <DataEntry label="Relay Protocol" value={school.phone} icon={Phone} />
                            <DataEntry label="Core Mail" value={school.email} icon={Mail} />
                            <DataEntry label="Base Coordinates" value={school.address || school.schoolAddress} icon={MapPin} />
                            <div className="pt-2 border-t border-white/5">
                                <StandardButton label="REMAP_LINKS" icon={Pencil} variant="ghost" size="xs" onClick={() => startEdit('contact')} />
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Developer Portal Card */}
                <GlassCard title="DEVELOPER_HUB" icon={Code} glowColor="warning" className="h-full" dense>
                    <div className="space-y-2">
                        <div className="p-2 rounded-xl bg-primary/5 border border-white/5">
                            <p className="text-micro font-black text-primary uppercase tracking-widest mb-1.5 font-black uppercase tracking-tight">Generate Protocol</p>
                            <div className="flex gap-2">
                                <input className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-micro text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-tight" placeholder="APP_ID..." value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                                <StandardButton icon={Plus} size="xs" onClick={handleCreateApiKey} />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-micro font-black text-slate-800 uppercase tracking-widest">Active Credentials</p>
                            {keysLoading ? (
                                <Loader size={12} className="animate-spin text-slate-500 mx-auto" />
                            ) : apiKeys.length === 0 ? (
                                <div className="text-center py-2 opacity-30 italic text-micro font-black uppercase">NO_RECORDS</div>
                            ) : (
                                <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                    {apiKeys.map(k => (
                                        <div key={k.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                                            <div className="min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                   <span className="text-micro font-black text-white italic truncate uppercase leading-none">{k.name}</span>
                                                   <span className={`text-[6px] px-1 py-0 rounded-full border tracking-widest leading-none ${k.status === 'active' ? 'bg-success/10 border-success/30 text-success' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>{k.status.toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                               <StandardButton variant="ghost" size="xs" icon={Trash2} className="text-rose-500" onClick={() => handleRevokeApiKey(k.key_id)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>

            <AnimatePresence>
                {showKeyModal && (
                    <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60" onClick={() => setShowKeyModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <GlassCard title="KEY GENERATED" onClose={() => setShowKeyModal(false)} glowColor="primary" className="p-8">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20"><Key size={32} /></div>
                                    <p className="text-xs text-center text-slate-400 font-bold leading-relaxed uppercase tracking-wide bg-primary/5 p-4 rounded-xl border border-primary/10">WARNING: Copy this protocol segment now. It will not be persistent in the manifold.</p>
                                    <div className="w-full relative group">
                                        <code className="block p-4 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-primary break-all pr-12">{generatedKey}</code>
                                        <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success('Segment Copied to Buffer'); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all"><Copy size={16} /></button>
                                    </div>
                                    <StandardButton label="MANIFOLD SECURED" className="w-full" onClick={() => setShowKeyModal(false)} />
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DataEntry({ label, value, icon: Icon }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center py-1.5 border-b border-white/5 last:border-0 group">
            <span className="text-micro font-black text-slate-700 w-28 uppercase tracking-widest group-hover:text-primary transition-colors leading-none">{label}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
               {Icon && <Icon size={10} className="text-slate-700 flex-shrink-0" />}
               <span className="text-micro font-black text-white italic group-hover:text-primary transition-colors truncate uppercase leading-none">{value || 'UNSPECIFIED'}</span>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, type = 'text' }) {
    return (
        <div className="space-y-1">
            <label className="text-micro text-slate-700 font-black uppercase tracking-widest block leading-none">{label}</label>
            {type === 'textarea' ? (
                <textarea className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-micro font-bold text-white focus:outline-none focus:border-primary/50 transition-all italic min-h-[60px]" value={value} onChange={e => onChange(e.target.value)} />
            ) : (
                <input type={type} className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-micro font-bold text-white focus:outline-none focus:border-primary/50 transition-all italic" value={value} onChange={e => onChange(e.target.value)} />
            )}
        </div>
    );
}

function SelectField({ label, value, options, onChange }) {
    return (
        <div className="space-y-1">
            <label className="text-micro text-slate-700 font-black uppercase tracking-widest block leading-none">{label}</label>
            <select className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-micro font-bold text-white focus:outline-none focus:border-primary/50 transition-all italic uppercase" value={value} onChange={e => onChange(e.target.value)}>
                <option value="">-- SYSTEM DEFAULT --</option>
                {options.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label.toUpperCase()}</option>)}
            </select>
        </div>
    );
}



