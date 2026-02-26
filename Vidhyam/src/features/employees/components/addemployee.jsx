// AddEmployeePage.jsx — Full-page employee admission form
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, User, Phone, MapPin, BookOpen, Briefcase,
    Save, Loader, CheckCircle, AlertTriangle, Calendar,
    Award, Building2, Hash, GraduationCap, Clock
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined') return v;
    }
    return '622079';
};

const genEmployeeId = () => {
    const prefix = 'EMP';
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${year}${rand}`;
};

const today = () => new Date().toISOString().split('T')[0];

const calcAge = (dob) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

// ─── Constants ───────────────────────────────────────────
const PROFILE_ROLES = [
    'Teacher', 'Principal', 'Vice Principal', 'Class Teacher',
    'Head of Department', 'Lab Assistant', 'Librarian',
    'Physical Education', 'Counsellor', 'Admin Staff',
    'Accountant', 'Peon', 'Security', 'Driver', 'Cook',
];

const RESPONSIBILITIES = [
    'Teaching', 'Exam Coordinator', 'Sports Incharge', 'Event Coordinator',
    'Hostel Warden', 'Transport Incharge', 'Lab Incharge', 'Library Incharge',
    'Discipline Committee', 'Time-Table Incharge', 'Account Management',
];

const EDU_LEVELS = [
    'High School (10th)',
    'Intermediate (12th)',
    'Graduation (B.A / B.Sc / B.Com etc)',
    'Post Graduation (M.A / M.Sc / M.Com etc)',
    'PhD / Doctorate',
    'Diploma / Certificate',
];

const STREAMS = [
    'Science', 'Commerce', 'Arts / Humanities', 'Engineering',
    'Medical', 'Management', 'Law', 'Education (B.Ed)', 'Other',
];

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

const SECTIONS = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'professional', label: 'Professional', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
];

// ─── Helpers ─────────────────────────────────────────────
function inp(err) {
    return `w-full bg-white/5 border ${err ? 'border-red-500/60' : 'border-white/10'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all`;
}

function Field({ label, children, error, optional }) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {label}{optional && <span className="ml-1 text-slate-600">(optional)</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────
export default function AddEmployeePage({ onBack, onSuccess }) {
    const navigate = useNavigate();
    const schoolId = getSchoolId();
    const [activeSection, setActiveSection] = useState('personal');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [createdId, setCreatedId] = useState(null);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        // personal
        name: '',
        fatherName: '',
        dob: '',
        gender: '',
        // contact
        phone: '',
        altPhone: '',
        email: '',
        addressLine1: '',
        addressCity: '',
        addressState: '',
        addressPincode: '',
        // professional
        profileRoles: [],      // multi-select
        responsibilities: [],  // multi-select
        baseSalary: '',
        joinDate: today(),
        employeeId: genEmployeeId(),
        // education
        educationLevel: '',
        schoolInstitutionName: '',   // for 10th/12th
        universityName: '',          // for graduation+
        stream: '',
        experienceYears: '',
        organizationName: '',
    });

    const age = useMemo(() => calcAge(form.dob), [form.dob]);

    const needsSchool = ['High School (10th)', 'Intermediate (12th)'].includes(form.educationLevel);
    const needsUniversity = ['Graduation (B.A / B.Sc / B.Com etc)', 'Post Graduation (M.A / M.Sc / M.Com etc)', 'PhD / Doctorate'].includes(form.educationLevel);

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: undefined }));
    };

    const toggleArr = (key, val) => {
        setForm(f => {
            const arr = f[key];
            return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
        });
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.phone.trim()) e.phone = 'Mobile number is required';
        if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter valid 10-digit number';
        if (form.profileRoles.length === 0) e.profileRoles = 'Select at least one role';
        if (needsSchool && !form.schoolInstitutionName.trim()) e.schoolInstitutionName = 'School/Institution name required';
        if (needsUniversity && !form.universityName.trim()) e.universityName = 'University name required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            setToast({ type: 'error', msg: 'Fix highlighted errors before saving' });
            return;
        }
        setSaving(true);
        const payload = {
            name: form.name,
            fatherName: form.fatherName,
            dob: form.dob,
            gender: form.gender,
            phone: form.phone,
            altPhone: form.altPhone,
            email: form.email,
            address: [form.addressLine1, form.addressCity, form.addressState, form.addressPincode].filter(Boolean).join(', '),
            type: form.profileRoles[0] || 'Teacher',        // primary role (legacy field)
            profileRoles: form.profileRoles.join(', '),
            responsibilities: form.responsibilities.join(', '),
            baseSalary: parseFloat(form.baseSalary) || 0,
            joinDate: form.joinDate,
            employeeId: form.employeeId,
            educationLevel: form.educationLevel,
            schoolInstitutionName: form.schoolInstitutionName,
            universityName: form.universityName,
            stream: form.stream,
            experienceYears: form.experienceYears,
            organizationName: form.organizationName,
        };
        try {
            const res = await fetch(`${API_BASE_URL}/employees/${schoolId}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok && data.success === false) throw new Error(data.message || 'Failed to create employee');
            const empId = data.employeeId || form.employeeId;
            setCreatedId(empId);
            setToast({ type: 'success', msg: `Employee added! ID: ${empId}` });
        } catch (err) {
            setToast({ type: 'error', msg: err.message });
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => { if (onBack) onBack(); else navigate(-1); };

    // ─── Section renderers ────────────────────────────────
    const PersonalSection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name}>
                <input className={inp(errors.name)} placeholder="e.g. Ramesh Kumar Singh"
                    value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Father's Name" optional>
                <input className={inp()} placeholder="Father's full name"
                    value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
            </Field>
            <Field label="Date of Birth">
                <div className="relative">
                    <input type="date" className={inp()} value={form.dob}
                        max={today()} onChange={e => set('dob', e.target.value)} />
                    {age !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                            {age} yrs
                        </span>
                    )}
                </div>
            </Field>
            <Field label="Gender">
                <select className={inp()} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </select>
            </Field>
            <Field label="Join Date">
                <input type="date" className={inp()} value={form.joinDate} onChange={e => set('joinDate', e.target.value)} />
            </Field>
            <Field label="Base Salary (₹)" optional>
                <input type="number" className={inp()} placeholder="e.g. 25000"
                    value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)} />
            </Field>
        </div>
    );

    const ContactSection = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Mobile Number *" error={errors.phone}>
                    <div className="flex">
                        <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm">+91</span>
                        <input className={inp(errors.phone) + ' rounded-l-none'} placeholder="10-digit mobile" maxLength={10}
                            value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
                    </div>
                </Field>
                <Field label="Alternate Number" optional>
                    <div className="flex">
                        <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm">+91</span>
                        <input className={inp() + ' rounded-l-none'} placeholder="Optional" maxLength={10}
                            value={form.altPhone} onChange={e => set('altPhone', e.target.value.replace(/\D/g, ''))} />
                    </div>
                </Field>
                <div className="md:col-span-2">
                    <Field label="Email ID" optional>
                        <input type="email" className={inp()} placeholder="employee@school.edu"
                            value={form.email} onChange={e => set('email', e.target.value)} />
                    </Field>
                </div>
            </div>

            {/* Address */}
            <div>
                <p className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <MapPin size={12} className="text-violet-400" /> Address
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Field label="Street / House / Village">
                            <input className={inp()} placeholder="House No, Street, Village/Area"
                                value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="City">
                        <input className={inp()} placeholder="City"
                            value={form.addressCity} onChange={e => set('addressCity', e.target.value)} />
                    </Field>
                    <Field label="State">
                        <select className={inp()} value={form.addressState} onChange={e => set('addressState', e.target.value)}>
                            <option value="">Select state</option>
                            {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Pincode">
                        <input className={inp()} placeholder="6-digit pincode" maxLength={6}
                            value={form.addressPincode} onChange={e => set('addressPincode', e.target.value.replace(/\D/g, ''))} />
                    </Field>
                </div>
            </div>
        </div>
    );

    const ProfessionalSection = () => (
        <div className="space-y-6">
            {/* Profile Roles — multi-select pill grid */}
            <Field label="Profile Role * (select all that apply)" error={errors.profileRoles}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {PROFILE_ROLES.map(role => {
                        const active = form.profileRoles.includes(role);
                        return (
                            <button key={role} type="button" onClick={() => toggleArr('profileRoles', role)}
                                className={`text-left px-3 py-2 rounded-xl border text-sm transition-all ${active
                                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                    }`}>
                                {active && <CheckCircle size={11} className="inline mr-1 text-violet-400" />}
                                {role}
                            </button>
                        );
                    })}
                </div>
            </Field>

            {/* Responsibilities */}
            <Field label="Responsibilities" optional>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {RESPONSIBILITIES.map(r => {
                        const active = form.responsibilities.includes(r);
                        return (
                            <button key={r} type="button" onClick={() => toggleArr('responsibilities', r)}
                                className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${active
                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:text-white'
                                    }`}>
                                {active && <CheckCircle size={10} className="inline mr-1 text-indigo-400" />}
                                {r}
                            </button>
                        );
                    })}
                </div>
            </Field>
        </div>
    );

    const EducationSection = () => (
        <div className="space-y-5">
            <Field label="Highest Education Level">
                <select className={inp()} value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                    <option value="">Select education level</option>
                    {EDU_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
            </Field>

            {/* Conditional: High School / Inter → school name */}
            {needsSchool && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <Field label="School / Institution Name *" error={errors.schoolInstitutionName}>
                        <input className={inp(errors.schoolInstitutionName)} placeholder="e.g. St. Mary's High School"
                            value={form.schoolInstitutionName} onChange={e => set('schoolInstitutionName', e.target.value)} />
                    </Field>
                </motion.div>
            )}

            {/* Conditional: Graduation+ → university name + stream */}
            {needsUniversity && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <Field label="University / College Name *" error={errors.universityName}>
                        <input className={inp(errors.universityName)} placeholder="e.g. Delhi University"
                            value={form.universityName} onChange={e => set('universityName', e.target.value)} />
                    </Field>
                    <Field label="Stream / Specialization">
                        <select className={inp()} value={form.stream} onChange={e => set('stream', e.target.value)}>
                            <option value="">Select stream</option>
                            {STREAMS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </Field>
                </motion.div>
            )}

            {/* Experience */}
            <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Clock size={12} className="text-violet-400" /> Work Experience
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Years of Experience" optional>
                        <div className="flex">
                            <input type="number" min="0" max="50" className={inp() + ' rounded-r-none'} placeholder="e.g. 5"
                                value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} />
                            <span className="flex items-center px-3 bg-slate-700 border border-l-0 border-white/10 rounded-r-lg text-slate-400 text-sm">yrs</span>
                        </div>
                    </Field>
                    <Field label="Previous Organization" optional>
                        <input className={inp()} placeholder="e.g. Delhi Govt School"
                            value={form.organizationName} onChange={e => set('organizationName', e.target.value)} />
                    </Field>
                </div>
            </div>
        </div>
    );

    const sectionContent = {
        personal: <PersonalSection />,
        contact: <ContactSection />,
        professional: <ProfessionalSection />,
        education: <EducationSection />,
    };

    // ─── Success screen ───────────────────────────────────
    if (createdId) {
        return (
            <div className="min-h-full flex items-center justify-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="glass-card p-12 max-w-md w-full mx-6 text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Employee Added!</h2>
                    <p className="text-slate-400 mb-6">Successfully registered into the system</p>
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 mb-8">
                        <p className="text-xs text-slate-500 mb-1">Employee ID</p>
                        <p className="text-3xl font-mono font-bold text-violet-300 tracking-wider">{createdId}</p>
                        <p className="text-sm text-slate-400 mt-2 font-medium">{form.name}</p>
                        <p className="text-xs text-slate-500">{form.profileRoles.join(' · ')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { if (onSuccess) onSuccess({ employeeId: createdId }); else goBack(); }}
                            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all">
                            Back to Employees
                        </button>
                        <button onClick={() => {
                            setCreatedId(null);
                            setForm(f => ({ ...f, name: '', phone: '', email: '', employeeId: genEmployeeId() }));
                            setActiveSection('personal');
                        }}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all border border-white/10">
                            Add Another
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────
    return (
        <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-md bg-slate-900/80 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={goBack}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                <Briefcase size={14} className="text-violet-400" />
                            </div>
                            New Employee Registration
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">Fill all sections • Auto-generates Employee ID &amp; Join Date</p>
                    </div>
                </div>
                <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-900/40">
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : 'Save Employee'}
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
                {/* Left nav */}
                <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0 sticky top-24 self-start">
                    {/* Auto-generated badge */}
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-2">
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Hash size={10} /> Employee ID</p>
                        <p className="text-sm font-mono font-bold text-violet-300 break-all">{form.employeeId}</p>
                    </div>
                    {SECTIONS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveSection(id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === id
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}>
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>

                {/* Mobile tabs */}
                <div className="md:hidden flex overflow-x-auto gap-2 pb-1 w-full">
                    {SECTIONS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveSection(id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${activeSection === id
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'bg-white/5 text-slate-400'
                                }`}>
                            <Icon size={12} /> {label}
                        </button>
                    ))}
                </div>

                {/* Section content */}
                <div className="flex-1 min-w-0">
                    {SECTIONS.map(({ id, label, icon: Icon }) => (
                        activeSection === id && (
                            <div key={id}>
                                <div className="glass-card p-6 mb-4">
                                    <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                                        <Icon size={16} className="text-violet-400" /> {label}
                                    </h2>
                                    {sectionContent[id]}
                                </div>
                                {id !== 'education' ? (
                                    <div className="flex justify-end">
                                        <button onClick={() => {
                                            const idx = SECTIONS.findIndex(s => s.id === id);
                                            if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
                                        }}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium border border-white/10 transition-all">
                                            Next →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <button onClick={handleSubmit} disabled={saving}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all">
                                            {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                                            {saving ? 'Saving…' : 'Register Employee'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    onAnimationComplete={() => setTimeout(() => setToast(null), 4000)}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium max-w-sm ${toast.type === 'success'
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                        }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );
}
