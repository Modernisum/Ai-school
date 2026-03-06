// AddStudentPage.jsx — Full-page multi-section student admission form
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, BookOpen, Bus, Save, Loader,
  CheckCircle, AlertTriangle, Calendar, MapPin, Plus, X,
  Hash, Shield, UserCheck, GraduationCap, DollarSign, Star, Tag
} from 'lucide-react';
import { getClassesByLevel } from '../../../utils/academicUtils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const getSchoolId = () => {
  for (const k of ['schoolId', 'school_id', 'currentSchoolId']) {
    const v = localStorage.getItem(k);
    if (v && v !== 'undefined') return v;
  }
  return '622079';
};

const today = () => new Date().toISOString().split('T')[0];

const SECTIONS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'academic', label: 'Academic', icon: BookOpen },
  { id: 'transport', label: 'Transport', icon: Bus },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

export default function AddStudentPage({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const schoolId = getSchoolId();

  const [activeSection, setActiveSection] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Referral coupon state
  const [referralCode, setReferralCode] = useState('');
  const [couponData, setCouponData] = useState(null); // validated coupon
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    studentId: 'Auto-generated',
    rollNumber: '',
    admissionDate: today(),
    roomNumber: '',
    // personal
    name: '',
    dob: '',
    gender: '',
    fatherName: '',
    motherName: '',
    aadhaarNumber: '',
    addressLine1: '',
    addressCity: '',
    addressState: '',
    addressPincode: '',
    tcNumber: '',
    // contact
    contact: '',
    alternativeContact: '',
    email: '',
    // academic
    className: '',
    section: '',
    studentType: 'Regular',   // 'Regular' | 'Private'
    enrolledSubjects: [],     // Array of {id, name, fee}
    totalFees: 0,
    // transport
    transportEnabled: false,
    transportRadius: '',
  });

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [errors, setErrors] = useState({});

  // Load classes from school level
  useEffect(() => {
    const schoolLevel = localStorage.getItem('schoolLevel') || 10;
    setClasses(getClassesByLevel(schoolLevel));
  }, []);

  // Load subjects when class changes
  useEffect(() => {
    if (!form.className) return;
    fetch(`${API_BASE_URL}/subjects/${schoolId}`)
      .then(r => r.json())
      .then(d => {
        const all = d.data || d.subjects || [];
        const classSubjects = all.filter(s =>
          !s.className || s.className === form.className || s.class_name === form.className
        );
        setSubjects(classSubjects);

        // Auto-select compulsory subjects
        const compulsory = classSubjects.filter(s => s.isCompulsory ?? true).map(s => ({
          id: s.id || s.subjectId || s.subject_id,
          name: s.subjectName || s.subject_name || s.name,
          fee: parseFloat(s.subjectFees ?? s.subject_fees ?? s.fees) || 0
        }));

        setForm(f => {
          const totalFees = compulsory.reduce((acc, s) => acc + s.fee, 0);
          return { ...f, enrolledSubjects: compulsory, totalFees };
        });
      })
      .catch(() => { });
  }, [form.className, schoolId]);

  // Auto-set roll number and room from class
  useEffect(() => {
    if (!form.className) return;
    const cls = classes.find(c => (c.name || c.className) === form.className);
    if (cls) {
      setForm(f => ({ ...f, roomNumber: cls.roomNumber || cls.room_number || '' }));
    }
    // fetch next roll number
    fetch(`${API_BASE_URL}/students/${schoolId}/nextRoll?className=${encodeURIComponent(form.className)}`)
      .then(r => r.json())
      .then(d => {
        if (d.nextRollNumber) setForm(f => ({ ...f, rollNumber: d.nextRollNumber }));
      })
      .catch(() => { });
  }, [form.className, classes, schoolId]);

  const set = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  }, []);

  // Extract class number helper
  const getClassNum = (name) => {
    const m = (name || '').match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  // When class changes, auto-lock studentType to Regular if class <= 9
  const handleClassChange = (val) => {
    const num = getClassNum(val);
    set('className', val);
    if (num > 0 && num <= 9) set('studentType', 'Regular');
  };

  const toggleSubject = (sub) => {
    const subId = sub.id || sub.subjectId || sub.subject_id;
    const isComp = sub.isCompulsory ?? true;
    if (isComp) return; // Cannot toggle compulsory

    setForm(f => {
      const already = f.enrolledSubjects.find(s => s.id === subId);
      const next = already
        ? f.enrolledSubjects.filter(s => s.id !== subId)
        : [...f.enrolledSubjects, {
          id: subId,
          name: sub.subjectName || sub.subject_name || sub.name,
          fee: parseFloat(sub.subjectFees ?? sub.subject_fees ?? sub.fees) || 0
        }];
      const totalFees = next.reduce((acc, s) => acc + s.fee, 0);
      return { ...f, enrolledSubjects: next, totalFees };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.contact.trim()) e.contact = 'Mobile number is required';
    if (!form.className) e.className = 'Class is required';
    if (!/^\d{10}$/.test(form.contact)) e.contact = 'Enter valid 10-digit mobile';
    if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber))
      e.aadhaarNumber = 'Aadhaar must be 12 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validate referral coupon
  const validateCoupon = async (code) => {
    if (!code.trim()) { setCouponData(null); setCouponError(''); return; }
    setCouponLoading(true); setCouponError('');
    try {
      const res = await fetch(`${API_BASE_URL}/fees/${schoolId}/coupons/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponName: code.trim() })
      });
      const d = await res.json();
      if (!res.ok || !d.success) { setCouponData(null); setCouponError('Coupon not found'); return; }
      if (d.data?.valid === false) { setCouponData(null); setCouponError(d.data.reason || 'Invalid'); return; }
      if (d.data?.valid) setCouponData(d.data);
    } catch { setCouponError('Network error'); }
    finally { setCouponLoading(false); }
  };

  const couponDiscount = couponData ? (
    couponData.discountType === 'percentage'
      ? (form.totalFees * parseFloat(couponData.discountValue)) / 100
      : parseFloat(couponData.discountValue)
  ) : 0;
  const finalFees = Math.max(0, form.totalFees - couponDiscount);

  const handleSubmit = async () => {
    if (!validate()) {
      setToast({ type: 'error', msg: 'Please fix the highlighted errors' });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      type: form.studentType,
      studentType: form.studentType,
      enrolledSubjects: JSON.stringify(form.enrolledSubjects),
      totalFees: finalFees,
      originalFees: form.totalFees,
      couponDiscount,
      referralCouponId: couponData?.couponId || null,
      referralCouponName: couponData?.couponName || null,
      additionalSubjects: form.enrolledSubjects.map(s => s.name).join(', '),
      transportEnabled: form.transportEnabled,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/students/${schoolId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Failed to create student');

      // Use coupon if one was applied
      if (couponData?.couponId && data.data?.studentId) {
        try {
          await fetch(`${API_BASE_URL}/fees/${schoolId}/coupons/${couponData.couponId}/use`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: data.data.studentId, discount: couponDiscount })
          });
        } catch { }
      }

      setToast({ type: 'success', msg: `Student ${form.name} created successfully!` });
      setTimeout(() => {
        if (onSuccess) onSuccess(data);
        else navigate(-1);
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => { if (onBack) onBack(); else navigate(-1); };

  /* ───────────── Section renderers ───────────── */

  const PersonalSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name *" error={errors.name}>
          <input className={inp(errors.name)} placeholder="e.g. Rahul Kumar Sharma"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Date of Birth">
          <input type="date" className={inp()} value={form.dob}
            max={today()} onChange={e => set('dob', e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className={inp()} value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Aadhaar Number" error={errors.aadhaarNumber}>
          <input className={inp(errors.aadhaarNumber)} placeholder="12-digit Aadhaar" maxLength={12}
            value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Father's Name">
          <input className={inp()} placeholder="Father's full name"
            value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
        </Field>
        <Field label="Mother's Name">
          <input className={inp()} placeholder="Mother's full name"
            value={form.motherName} onChange={e => set('motherName', e.target.value)} />
        </Field>
        <Field label="TC Number (optional)">
          <input className={inp()} placeholder="Transfer certificate number"
            value={form.tcNumber} onChange={e => set('tcNumber', e.target.value)} />
        </Field>
      </div>

      {/* Address */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-indigo-400" /> Address
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
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
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

  const ContactSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Mobile Number *" error={errors.contact}>
        <div className="flex">
          <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm">+91</span>
          <input className={inp(errors.contact) + ' rounded-l-none'} placeholder="10-digit mobile"
            maxLength={10} value={form.contact}
            onChange={e => set('contact', e.target.value.replace(/\D/g, ''))} />
        </div>
      </Field>
      <Field label="Alternative Number (optional)">
        <div className="flex">
          <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm">+91</span>
          <input className={inp() + ' rounded-l-none'} placeholder="Alternate number"
            maxLength={10} value={form.alternativeContact}
            onChange={e => set('alternativeContact', e.target.value.replace(/\D/g, ''))} />
        </div>
      </Field>
      <Field label="Email ID">
        <input type="email" className={inp()} placeholder="student@email.com"
          value={form.email} onChange={e => set('email', e.target.value)} />
      </Field>
    </div>
  );

  const AcademicSection = () => (
    <div className="space-y-5">
      {/* Auto-generated info cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Student ID', value: form.studentId, icon: Hash },
          { label: 'Roll Number', value: form.rollNumber || 'Auto-assign', icon: UserCheck },
          { label: 'Admission Date', value: form.admissionDate, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-center">
            <Icon size={16} className="text-indigo-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm font-bold text-indigo-300 truncate">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Class *" error={errors.className}>
          <select className={inp(errors.className)} value={form.className}
            onChange={e => handleClassChange(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Field label="Section">
          <input className={inp()} placeholder="e.g. A, B, C"
            value={form.section} onChange={e => set('section', e.target.value)} />
        </Field>
        {/* Student Type — locked for Class ≤9, choosable for Class 10+ */}
        {form.className && (
          <Field label="Student Type">
            {getClassNum(form.className) <= 9 && getClassNum(form.className) > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <span className="text-sm text-indigo-300 font-medium">Regular</span>
                <span className="text-[10px] text-slate-500 ml-auto">Auto-assigned for Class {form.className}</span>
              </div>
            ) : (
              <select className={inp()} value={form.studentType} onChange={e => set('studentType', e.target.value)}>
                <option value="Regular">Regular</option>
                <option value="Private">Private</option>
              </select>
            )}
          </Field>
        )}
        {form.roomNumber && (
          <Field label="Classroom / Room No (auto)">
            <input className={inp() + ' opacity-60'} readOnly value={form.roomNumber} />
          </Field>
        )}
        <Field label="Admission Date">
          <input type="date" className={inp()} value={form.admissionDate}
            onChange={e => set('admissionDate', e.target.value)} />
        </Field>
      </div>

      {/* Subject selection */}
      {form.className && (
        <div>
          <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap size={14} className="text-purple-400" /> Subjects & Activities
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Class {form.className}</span>
          </p>
          {subjects.length === 0 ? (
            <div className="py-8 text-center bg-white/5 rounded-2xl border border-white/5">
              <BookOpen size={24} className="mx-auto mb-2 text-slate-600 opacity-50" />
              <p className="text-xs text-slate-500 italic">No subjects available for this class</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map(sub => {
                const subId = sub.id || sub.subjectId || sub.subject_id;
                const isSelected = form.enrolledSubjects.some(s => s.id === subId);
                const isComp = sub.isCompulsory ?? true;
                const fee = parseFloat(sub.subjectFees ?? sub.subject_fees ?? sub.fees) || 0;

                return (
                  <button key={subId} type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`relative text-left px-4 py-3 rounded-2xl border transition-all duration-300 ${isSelected
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-100 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      } ${isComp ? 'cursor-default' : 'hover:-translate-y-0.5'}`}>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-[13px]">{sub.subjectName || sub.subject_name || sub.name}</p>
                          {isComp && <Star size={10} className="text-amber-400 fill-amber-400" />}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <DollarSign size={10} className="text-emerald-500" />
                          <span>₹{fee.toLocaleString('en-IN')} / {sub.feeType || 'mo'}</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected
                        ? 'bg-indigo-500 border-indigo-400 text-white'
                        : 'border-white/20 text-transparent'
                        }`}>
                        <CheckCircle size={12} strokeWidth={3} />
                      </div>
                    </div>

                    {isComp && (
                      <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-amber-500 text-[8px] font-black text-slate-900 rounded uppercase tracking-tighter shadow-lg">
                        Compulsory
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {form.enrolledSubjects.length > 0 && (
            <>
              <div className="mt-6 bg-gradient-to-r from-emerald-500/20 via-indigo-500/10 to-transparent border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subject Fees</p>
                    <p className="text-sm text-emerald-300 font-medium">{form.enrolledSubjects.length} subjects & activities enrolled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black tracking-tighter ${couponDiscount > 0 ? 'text-slate-500 line-through text-lg' : 'text-emerald-400'}`}>₹{form.totalFees.toLocaleString('en-IN')}</p>
                  {couponDiscount > 0 && <p className="text-2xl font-black text-emerald-400 tracking-tighter">₹{finalFees.toLocaleString('en-IN')}</p>}
                  <p className="text-[10px] text-slate-500 font-bold">{couponDiscount > 0 ? 'AFTER DISCOUNT' : 'ESTIMATED TOTAL'}</p>
                </div>
              </div>

              {/* Referral Coupon */}
              <div className="mt-4 p-4 bg-violet-500/5 border border-violet-500/15 rounded-2xl space-y-3">
                <p className="text-xs font-semibold text-violet-400 flex items-center gap-2"><Tag size={14} /> Referral / Discount Coupon</p>
                <div className="flex gap-2">
                  <input
                    className="input-dark flex-1 uppercase"
                    placeholder="Enter coupon code..."
                    value={referralCode}
                    onChange={e => { setReferralCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(''); }}
                  />
                  <button type="button" onClick={() => validateCoupon(referralCode)} disabled={couponLoading || !referralCode.trim()}
                    className="btn-secondary px-4 flex items-center gap-1 disabled:opacity-50">
                    {couponLoading ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />} Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle size={12} /> {couponError}</p>}
                {couponData && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-emerald-300">{couponData.couponName}</p>
                        <p className="text-[10px] text-slate-500">
                          {couponData.discountType === 'percentage' ? `${couponData.discountValue}% off` : `₹${parseFloat(couponData.discountValue).toLocaleString('en-IN')} off`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">-₹{couponDiscount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const TransportSection = () => (
    <div className="space-y-5">
      <div
        onClick={() => set('transportEnabled', !form.transportEnabled)}
        className={`cursor-pointer flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${form.transportEnabled
          ? 'bg-blue-500/15 border-blue-500/50'
          : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${form.transportEnabled ? 'bg-blue-500/20' : 'bg-slate-700'
          }`}>
          <Bus size={22} className={form.transportEnabled ? 'text-blue-400' : 'text-slate-500'} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">School Transport</p>
          <p className="text-sm text-slate-400">Student requires school bus facility</p>
        </div>
        {/* Toggle */}
        <div className={`relative w-12 h-6 rounded-full transition-colors ${form.transportEnabled ? 'bg-blue-500' : 'bg-slate-600'
          }`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.transportEnabled ? 'left-7' : 'left-1'
            }`} />
        </div>
      </div>

      {form.transportEnabled && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
          <Field label="Distance / Route Radius">
            <div className="flex">
              <input className={inp() + ' rounded-r-none'} placeholder="e.g. 5"
                type="number" min="0" value={form.transportRadius}
                onChange={e => set('transportRadius', e.target.value)} />
              <span className="flex items-center px-3 bg-slate-700 border border-l-0 border-white/10 rounded-r-lg text-slate-400 text-sm">km</span>
            </div>
          </Field>
        </motion.div>
      )}

      {!form.transportEnabled && (
        <div className="text-center py-8 text-slate-500">
          <Bus size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Enable transport above to set route details</p>
        </div>
      )}
    </div>
  );

  /* ───────────── Reusable helpers ───────────── */
  function inp(err) {
    return `w-full bg-white/5 border ${err ? 'border-red-500/60' : 'border-white/10'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all`;
  }

  function Field({ label, children, error }) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
        {children}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  }

  const sectionContent = {
    personal: <PersonalSection />,
    contact: <ContactSection />,
    academic: <AcademicSection />,
    transport: <TransportSection />,
  };

  /* ───────────── Render ───────────── */
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
              <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <User size={14} className="text-indigo-400" />
              </div>
              New Student Admission
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Fill all sections • System generates ID &amp; Roll No</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/40">
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Student'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
        {/* Left nav */}
        <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0 sticky top-24 self-start">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Mobile section tabs */}
        <div className="md:hidden flex overflow-x-auto gap-2 pb-1 w-full">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeSection === id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-slate-400'
                }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <motion.div key={id}
              initial={false}
              animate={{ opacity: activeSection === id ? 1 : 0, display: activeSection === id ? 'block' : 'none' }}>
              <div className="glass-card p-6 mb-4">
                <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                  <Icon size={16} className="text-indigo-400" /> {label}
                </h2>
                {sectionContent[id]}
              </div>
              {activeSection === id && id !== 'transport' && (
                <div className="flex justify-end">
                  <button onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === id);
                    if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
                  }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all border border-white/10">
                    Next →
                  </button>
                </div>
              )}
              {activeSection === id && id === 'transport' && (
                <div className="flex justify-end">
                  <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all">
                    {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Saving…' : 'Create Student'}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          onAnimationComplete={() => setTimeout(() => setToast(null), 3000)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium ${toast.type === 'success'
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