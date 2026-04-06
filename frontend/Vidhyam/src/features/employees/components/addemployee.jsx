// AddEmployeePage.jsx — Refactored modern, non-scrollable stepper UI
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Phone, MapPin, Briefcase, GraduationCap,
    Save, Loader, CheckCircle, X, Plus, ChevronRight, ChevronLeft,
    Check, Calendar, Info
} from 'lucide-react';
import { useAddEmployeeMutation } from '../api/employeeApi';
import { useGetResponsibilitiesQuery } from '../../infrastructure/infrastructureApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const getSchoolId = () => {
    for (const k of ['schoolId', 'school_id']) {
        const v = localStorage.getItem(k);
        if (v && v !== 'undefined' && v !== 'null') return v;
    }
    return "";
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

// ─── Helpers ─────────────────────────────────────────────
const inp = (err) => `
    w-full h-[36px] bg-white/5 border ${err ? 'border-red-500/50' : 'border-white/10'} 
    rounded-lg px-3 text-[13px] text-white placeholder-slate-500 
    focus:outline-none focus:border-[var(--primary-color)] focus:bg-white/[0.08] 
    transition-all
`;

function Field({ label, children, error, optional, id }) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight flex justify-between">
                <span>{label}</span>
                {optional && <span className="text-[10px] text-slate-600 normal-case font-normal italic">optional</span>}
            </label>
            {children}
            {error && <p className="text-[10px] text-red-400 font-medium">{error}</p>}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────
export default function AddEmployeePage({ onSuccess }) {
    const navigate = useNavigate();
    const schoolId = getSchoolId();
    const [addEmployee, { isLoading: saving }] = useAddEmployeeMutation();
    const { data: respData } = useGetResponsibilitiesQuery(schoolId);

    const [currentSlide, setCurrentSlide] = useState(1);
    const [toast, setToast] = useState(null);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        name: '',
        fatherName: '',
        motherName: '',
        dob: '',
        gender: '',
        phone: '',
        altPhone: '',
        email: '',
        address: '',
        aadhaarNumber: '',
        employeeType: '',
        subject: '',
        baseSalary: '',
        joinDate: today(),
        employeeId: genEmployeeId(),
        // Academic/Education
        educationLevel: '',
        institutionName: '',
        universityName: '',
        stream: '',
        passingYear: '',
        grade: '',
        experienceYears: '',
        prevOrg: '',
        // Roles
        roles: [] // [{spaceId, roleIds}]
    });

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        if (errors[k]) setErrors(e => { const { [k]: _, ...rest } = e; return rest; });
    };

    const age = useMemo(() => calcAge(form.dob), [form.dob]);

    const validateSlide = (slide) => {
        const e = {};
        if (slide === 1) {
            if (!form.name.trim()) e.name = 'Required';
            if (!form.dob) e.dob = 'Required';
            if (!form.gender) e.gender = 'Required';
            if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) e.phone = 'Valid 10-digit number';
            if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email';
            if (!form.address.trim()) e.address = 'Required';
            if (!form.employeeType) e.employeeType = 'Required';
        } else if (slide === 2) {
            if (!form.educationLevel) e.educationLevel = 'Required';
            if (!form.institutionName.trim()) e.institutionName = 'Required';
            if (!form.passingYear) e.passingYear = 'Required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validateSlide(1)) setCurrentSlide(2);
        else setToast({ type: 'error', msg: 'Please fill required personal details' });
    };

    const handlePrev = () => setCurrentSlide(1);

    const handleSubmit = async () => {
        if (!validateSlide(2)) {
            setToast({ type: 'error', msg: 'Please fill required academic details' });
            return;
        }

        try {
            const payload = {
                ...form,
                baseSalary: parseFloat(form.baseSalary) || 0,
                age: age || 0,
                "permanent address": form.address, // Match backend key
                type: form.employeeType,
                education: [{
                    level: form.educationLevel,
                    institution: form.institutionName,
                    university: form.universityName,
                    stream: form.stream,
                    year: form.passingYear,
                    grade: form.grade
                }],
                experience: form.experienceYears ? [{
                    years: form.experienceYears,
                    organization: form.prevOrg
                }] : []
            };

            await addEmployee({ schoolId, employeeData: payload }).unwrap();
            setToast({ type: 'success', msg: 'Employee added successfully!' });
            setTimeout(() => { if (onSuccess) onSuccess(); else navigate('/employees'); }, 1500);
        } catch (err) {
            setToast({ type: 'error', msg: err?.data?.message || 'Failed to save employee' });
        }
    };

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    return (
        <div className="h-full w-full flex flex-col overflow-hidden relative font-sans">
            {/* Background Theme Glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--primary-color)] opacity-5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[var(--primary-color)] opacity-5 blur-[100px] pointer-events-none" />

            {/* Header / Stepper Indicator */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02] backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div data-testid="user-icon-container" className="w-8 h-8 rounded-lg bg-[var(--primary-color)]/10 flex items-center justify-center border border-[var(--primary-color)]/20">
                        <User size={18} className="text-[var(--primary-color)]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Add New Employee</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">School Admission Protocol</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {[1, 2].map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                currentSlide === s 
                                ? 'bg-[var(--primary-color)] text-white ring-4 ring-[var(--primary-color)]/20' 
                                : currentSlide > s ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-500'
                            }`}>
                                {currentSlide > s ? <Check size={12} /> : s}
                            </div>
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${currentSlide === s ? 'text-white' : 'text-slate-600'}`}>
                                {s === 1 ? 'Personal' : 'Academic'}
                            </span>
                            {s === 1 && <div className="w-8 h-[1px] bg-white/10 ml-2" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area - Non-scrollable */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: currentSlide === 1 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: currentSlide === 1 ? 20 : -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full max-w-4xl bg-white/[0.03] border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-2xl"
                    >
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {currentSlide === 1 ? (
                                <>
                                    <Field label="Full Name *" error={errors.name} id="name">
                                        <input id="name" className={inp(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rajesh Kumar" />
                                    </Field>
                                    <Field label="Gender *" error={errors.gender} id="gender">
                                        <select id="gender" className={inp(errors.gender)} value={form.gender} onChange={e => set('gender', e.target.value)}>
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </Field>
                                    <Field label="Father's Name" optional id="fatherName">
                                        <input id="fatherName" className={inp()} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="Father's Name" />
                                    </Field>
                                    <Field label="Mother's Name" optional id="motherName">
                                        <input id="motherName" className={inp()} value={form.motherName} onChange={e => set('motherName', e.target.value)} placeholder="Mother's Name" />
                                    </Field>
                                    <Field label="Date of Birth *" error={errors.dob} id="dob">
                                        <div className="relative">
                                            <input id="dob" type="date" className={inp(errors.dob)} value={form.dob} onChange={e => set('dob', e.target.value)} max={today()} />
                                            {age !== null && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-1.5 py-0.5 rounded">{age}y</span>}
                                        </div>
                                    </Field>
                                    <Field label="Contact Number *" error={errors.phone} id="phone">
                                        <input id="phone" className={inp(errors.phone)} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,''))} placeholder="10-digit mobile" maxLength={10} />
                                    </Field>
                                    <Field label="Email Address *" error={errors.email} id="email">
                                        <input id="email" type="email" className={inp(errors.email)} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@school.com" />
                                    </Field>
                                    <Field label="Aadhaar Number" optional id="aadhaarNumber">
                                        <input id="aadhaarNumber" className={inp()} value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g,''))} placeholder="12-digit Aadhaar" maxLength={12} />
                                    </Field>
                                    <div className="col-span-2">
                                        <Field label="Permanent Address *" error={errors.address} id="address">
                                            <textarea id="address" className={`${inp(errors.address)} h-[60px] py-2 resize-none`} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full residential address..." />
                                        </Field>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Field label="Employee Type *" error={errors.employeeType} id="employeeType">
                                        <select id="employeeType" className={inp(errors.employeeType)} value={form.employeeType} onChange={e => set('employeeType', e.target.value)}>
                                            <option value="">Select Type</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </Field>
                                    <Field label="Assigned Subject" optional id="subject">
                                        <input id="subject" className={inp()} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
                                    </Field>
                                    <Field label="Highest Degree *" error={errors.educationLevel} id="educationLevel">
                                        <select id="educationLevel" className={inp(errors.educationLevel)} value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                                            <option value="">Select Education</option>
                                            <option value="B.Ed">B.Ed</option>
                                            <option value="M.Ed">M.Ed</option>
                                            <option value="Graduation">Graduation</option>
                                            <option value="Post Graduation">Post Graduation</option>
                                            <option value="PhD">PhD</option>
                                        </select>
                                    </Field>
                                    <Field label="Institution/School *" error={errors.institutionName} id="institutionName">
                                        <input id="institutionName" className={inp(errors.institutionName)} value={form.institutionName} onChange={e => set('institutionName', e.target.value)} placeholder="Name of institution" />
                                    </Field>
                                    <Field label="University/Board" optional id="universityName">
                                        <input id="universityName" className={inp()} value={form.universityName} onChange={e => set('universityName', e.target.value)} placeholder="University name" />
                                    </Field>
                                    <Field label="Stream/Major" optional id="stream">
                                        <input id="stream" className={inp()} value={form.stream} onChange={e => set('stream', e.target.value)} placeholder="e.g. Science, Arts" />
                                    </Field>
                                    <Field label="Passing Year *" error={errors.passingYear} id="passingYear">
                                        <input id="passingYear" type="number" className={inp(errors.passingYear)} value={form.passingYear} onChange={e => set('passingYear', e.target.value)} placeholder="YYYY" min="1970" max={new Date().getFullYear()} />
                                    </Field>
                                    <Field label="Grade/Percentage" optional id="grade">
                                        <input id="grade" className={inp()} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="e.g. 85% or A+" />
                                    </Field>
                                    <Field label="Experience (Years)" optional id="experienceYears">
                                        <input id="experienceYears" type="number" className={inp()} value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} placeholder="Total years" />
                                    </Field>
                                    <Field label="Previous Organization" optional id="prevOrg">
                                        <input id="prevOrg" className={inp()} value={form.prevOrg} onChange={e => set('prevOrg', e.target.value)} placeholder="Company/School name" />
                                    </Field>
                                    <Field label="Base Salary (Monthly)" optional id="baseSalary">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-500">₹</span>
                                            <input id="baseSalary" type="number" className={`${inp()} pl-7`} value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)} placeholder="e.g. 25000" />
                                        </div>
                                    </Field>
                                    <Field label="Joining Date" optional id="joinDate">
                                        <input id="joinDate" type="date" className={inp()} value={form.joinDate} onChange={e => set('joinDate', e.target.value)} />
                                    </Field>
                                </>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between z-10">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)] animate-pulse" />
                    System Ready
                </div>

                <div className="flex items-center gap-3">
                    {currentSlide === 2 && (
                        <button
                            onClick={handlePrev}
                            className="h-[38px] px-5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                    )}

                    {currentSlide === 1 ? (
                        <button
                            onClick={handleNext}
                            className="h-[38px] px-6 rounded-xl bg-[var(--primary-color)] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[var(--primary-color)]/20 transition-all flex items-center gap-2"
                        >
                            Next Step <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="h-[38px] px-8 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                            Finalize Admission
                        </button>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-md border flex items-center gap-2 z-50 shadow-2xl ${
                            toast.type === 'success' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={14} /> : <X size={14} />}
                        <span className="text-[11px] font-bold tracking-tight">{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
