// AddStudentPage.jsx — Full-page multi-section student admission form
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, BookOpen, Bus, Save, Loader,
  CheckCircle, AlertTriangle, Calendar, MapPin, Plus, X,
  Hash, Shield, UserCheck, GraduationCap, DollarSign, Star, Tag,
  ShieldAlert, ArrowRight
} from 'lucide-react';
import { getSchoolIdFromStorage } from '../../../utils/api';

import { academicApi } from '../../academics/api/academicApi';
const { useGetClassesQuery } = academicApi;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const SERVER_ROOT = API_BASE.replace(/\/api\/?$/, '');

const getSchoolId = () => getSchoolIdFromStorage() || "";


const today = () => new Date().toISOString().split('T')[0];

const SECTIONS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'academic', label: 'Academic', icon: BookOpen },
  { id: 'transport', label: 'Transport', icon: Bus },
];



/* ───────────── Reusable helpers ───────────── */
function inp(err) {
  return `w-full bg-white/5 border ${err ? 'border-accent/60' : 'border-white/10'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/60 focus:bg-white/[0.08] transition-all`;
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

export default function AddStudentPage({ onSuccess, onBack, mode: propMode, studentId: propStudentId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = propMode || searchParams.get('mode'); // 'edit' or null
  const editStudentId = propStudentId || searchParams.get('studentId');
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
    profileImageUrl: '',
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
    addressCountryId: '',
    addressCountryCode: '',
    addressPhoneCode: '+91',
    addressStateId: '',
    addressState: '',
    addressDistrict: '',
    addressCity: '',
    addressPincode: '',
    tcNumber: '',
    // contact
    contact: '',
    alternativeContact: '',
    email: '',
    // academic
    className: '',
    studentType: 'Regular',   // 'Regular' | 'Private'
    enrolledSubjects: [],     // Array of {id, name, fee}
    totalFees: 0,
    // transport
    transportEnabled: false,
    transportRadius: '',
  });

  const [initialForm, setInitialForm] = useState(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffData, setDiffData] = useState([]);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [pendingProfileFile, setPendingProfileFile] = useState(null);
  const [localProfilePreview, setLocalProfilePreview] = useState('');

  // Geo state
  const [countries, setCountries] = useState([]);
  const [geoStates, setGeoStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Fetch countries once
  useEffect(() => {
    fetch(`${API_BASE}/geo/countries`)
      .then(r => r.json())
      .then(d => setCountries(Array.isArray(d) ? d : []))
      .catch(() => { });
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (!form.addressCountryId) { setGeoStates([]); setDistricts([]); return; }
    setLoadingStates(true);
    setGeoStates([]); setDistricts([]);
    fetch(`${API_BASE}/geo/states/${form.addressCountryId}`)
      .then(r => r.json())
      .then(d => setGeoStates(Array.isArray(d) ? d : []))
      .catch(() => { })
      .finally(() => setLoadingStates(false));
  }, [form.addressCountryId]);

  // Fetch districts when state changes
  useEffect(() => {
    if (!form.addressStateId) { setDistricts([]); return; }
    setLoadingDistricts(true);
    setDistricts([]);
    fetch(`${API_BASE}/geo/districts/${form.addressStateId}`)
      .then(r => r.json())
      .then(d => setDistricts(Array.isArray(d) ? d : []))
      .catch(() => { })
      .finally(() => setLoadingDistricts(false));
  }, [form.addressStateId]);

  // Load classes from backend using RTK Query
  const { data: classData = [] } = useGetClassesQuery(schoolId, { skip: !schoolId });

  useEffect(() => {
    if (classData.length > 0) {
      const list = classData.map(c => ({
        name: c.name || c.className || c,
        roomNumber: c.roomNumber || c.room_number || ''
      }));
      setClasses(list);
    }
  }, [classData]);

  // Load subjects when class changes
  useEffect(() => {
    if (!form.className) return;
    fetch(`${API_BASE}/subjects/${schoolId}`)
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
    fetch(`${API_BASE}/students/${schoolId}/nextRoll?className=${encodeURIComponent(form.className)}`)
      .then(r => r.json())
      .then(d => {
        if (d.nextRollNumber) setForm(f => ({ ...f, rollNumber: d.nextRollNumber }));
      })
      .catch(() => { });
  }, [form.className, classes, schoolId]);

  // Edit Mode: Load student data
  useEffect(() => {
    if (mode === 'edit' && editStudentId) {
      fetch(`${API_BASE}/students/${schoolId}/${editStudentId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            const s = d.data;

            // Cleanup phone numbers for display (strip prefix)
            let contact = s.contact || '';
            let altContact = s.alternativeContact || '';
            let phoneCode = form.addressPhoneCode || '+91';

            // If it starts with '+', try to extract the code
            if (contact.startsWith('+')) {
              // Try common +91 first, or look for first 3 chars
              if (contact.startsWith('+91')) {
                phoneCode = '+91';
                contact = contact.substring(3);
              } else {
                // Generic: first '+' until 10 digits remain (basic heuristic)
                const digitsOnly = contact.replace(/\D/g, '');
                if (digitsOnly.length > 10) {
                  const prefixLen = digitsOnly.length - 10;
                  // This is risky without a full country list, but let's assume +XX
                  // For now, if it's +91 we are safe.
                }
              }
            }
            if (altContact.startsWith('+91')) {
              altContact = altContact.substring(3);
            }

            setForm(f => ({
              ...f,
              ...s,
              contact,
              alternativeContact: altContact,
              addressPhoneCode: phoneCode,
              studentId: s.studentId || editStudentId,
              enrolledSubjects: s.enrolledSubjects || [],
              totalFees: parseFloat(s.totalFees) || 0,
            }));
            setInitialForm({
              ...s,
              studentId: s.studentId || editStudentId,
              enrolledSubjects: s.enrolledSubjects || [],
              totalFees: parseFloat(s.totalFees) || 0,
            });

            // Auto-load subjects for the class if it's set
            if (s.className) {
              set('className', s.className);
            }
          }
        })
        .catch(() => { });
    }
  }, [mode, editStudentId, schoolId]);

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

  const validateSection = (sectionId) => {
    const e = {};
    if (sectionId === 'personal') {
      if (!form.name.trim()) e.name = 'Full name is required';
      if (!form.dob) e.dob = 'Date of birth is required';
      if (!form.gender) e.gender = 'Gender is required';
      if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber))
        e.aadhaarNumber = 'Aadhaar must be 12 digits';
    } else if (sectionId === 'contact') {
      if (!form.contact.trim()) e.contact = 'Mobile number is required';
      else if (!/^\d{10}$/.test(form.contact)) e.contact = 'Enter valid 10-digit number';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = 'Enter a valid email address';
    } else if (sectionId === 'academic') {
      if (!form.className) e.className = 'Class is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Frontend validation for all fields
  const validateForm = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.contact.trim()) e.contact = 'Mobile number is required';
    if (!form.className) e.className = 'Class is required';
    if (!/^\d{10}$/.test(form.contact)) e.contact = 'Enter valid 10-digit mobile';
    if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber))
      e.aadhaarNumber = 'Aadhaar must be 12 digits';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';

    // Email check
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Backend validation for duplicates (Aadhaar, Phone, Email)
  const validateBackend = async (payload) => {
    try {
      // Pass studentId to exclude current record during edits
      const checkPayload = { ...payload };
      if (mode === 'edit' && editStudentId) {
        checkPayload.studentId = editStudentId;
      }

      const res = await fetch(`${API_BASE}/students/${schoolId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkPayload)
      });
      const d = await res.json();

      if (!res.ok || !d.success) {
        setToast({ type: 'error', msg: d.message || 'Server validation failed' });
        // Map backend error to specific field for UX
        if (d.message?.toLowerCase().includes('aadhaar')) setErrors(e => ({ ...e, aadhaarNumber: d.message }));
        if (d.message?.toLowerCase().includes('contact')) setErrors(e => ({ ...e, contact: d.message }));
        if (d.message?.toLowerCase().includes('email')) setErrors(e => ({ ...e, email: d.message }));
        return false;
      }
      return true;
    } catch (err) {
      setToast({ type: 'error', msg: 'Network error: Could not validate with server' });
      return false;
    }
  };

  const handleNext = async () => {
    if (validateSection(activeSection)) {
      const payload = {
        aadhaarNumber: form.aadhaarNumber,
        contact: `${form.addressPhoneCode}${form.contact}`,
        email: form.email,
      };
      const isValid = await validateBackend(payload);
      if (!isValid) return;

      const idx = SECTIONS.findIndex(s => s.id === activeSection);
      if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
    } else {
      setToast({ type: 'error', msg: 'Please fix required fields before proceeding' });
    }
  };

  // Validate referral coupon
  const validateCoupon = async (code) => {
    if (!code.trim()) { setCouponData(null); setCouponError(''); return; }
    setCouponLoading(true); setCouponError('');
    try {
      const res = await fetch(`${API_BASE}/fees/${schoolId}/coupons/validate`, {
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

  const [uploading, setUploading] = useState(false);
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- Cleanup Previous Orphaned Image (if any) ---
    if (form.profileImageUrl && form.profileImageUrl.startsWith('/uploads')) {
      try {
        await fetch(`${API_BASE}/storage/file-by-url?url=${encodeURIComponent(form.profileImageUrl)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('[Cleanup] Failed to delete previous orphaned image:', err.message);
      }
    }

    // Clear old preview and show spinner
    set('profileImageUrl', '');
    setLocalProfilePreview('');
    setUploading(true);

    try {
      // Upload directly to backend — preview will use the returned server URL
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_id', schoolId);
      formData.append('user_type', 'student');

      const uploadRes = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.message || 'Upload failed');
      }

      // Set the relative URL from backend (e.g. /uploads/ab/cd/hash.jpg)
      set('profileImageUrl', uploadData.url);
    } catch (err) {
      setToast({ type: 'error', msg: `Image upload failed: ${err.message}` });
      console.error('[Upload] Failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!form.profileImageUrl) return;

    // If it's a backend URL, delete it from the server
    if (form.profileImageUrl.startsWith('/uploads')) {
      try {
        console.info('[Cleanup] Manual removal of orphaned image:', form.profileImageUrl);
        await fetch(`${API_BASE}/storage/file-by-url?url=${encodeURIComponent(form.profileImageUrl)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('[Cleanup] Failed to delete orphaned image:', err.message);
      }
    }

    set('profileImageUrl', '');
    if (localProfilePreview) {
      URL.revokeObjectURL(localProfilePreview);
      setLocalProfilePreview('');
    }
    setPendingProfileFile(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setToast({ type: 'error', msg: 'Please fix the highlighted errors' });
      return;
    }

    const payload = {
      ...form,
      contact: `${form.addressPhoneCode}${form.contact}`,
      alternativeContact: form.alternativeContact ? `${form.addressPhoneCode}${form.alternativeContact}` : null,
      type: form.studentType,
      enrolledSubjects: form.enrolledSubjects,
      totalFee: finalFees,
      originalFees: form.totalFees,
      couponDiscount,
      referralCouponId: couponData?.couponId || null,
      referralCouponName: couponData?.couponName || null,
      additionalSubjects: form.enrolledSubjects.map(s => s.name).join(', '),
      transportEnabled: form.transportEnabled,
    };

    const isValidBackend = await validateBackend(payload);
    if (!isValidBackend) return;

    // Clean payload: convert empty strings to null and parse numbers
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => {
        if (v === '') return [k, null];
        if (['addressCountryId', 'addressStateId', 'transportRadius', 'totalFee', 'originalFees', 'couponDiscount'].includes(k)) {
          return [k, v === null ? null : Number(v)];
        }
        return [k, v];
      })
    );

    setSaving(true);
    try {
      let finalProfileUrl = form.profileImageUrl;

      // Fallback: if immediate upload failed, try uploading now
      if (pendingProfileFile && !finalProfileUrl?.startsWith('/uploads')) {
        const formData = new FormData();
        formData.append('file', pendingProfileFile);
        formData.append('school_id', schoolId);
        formData.append('user_type', 'student');
        const uploadRes = await fetch(`${API_BASE}/storage/upload`, {
          method: 'POST', body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.message || 'Profile image upload failed');
        }
        finalProfileUrl = uploadData.url;
      }

      const submissionPayload = {
        ...cleanPayload,
        profileImageUrl: finalProfileUrl,
      };

      const url = mode === 'edit'
        ? `${API_BASE}/students/${schoolId}/${editStudentId}`
        : `${API_BASE}/students/${schoolId}`;
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Failed to create student');

      // Use coupon if one was applied
      if (couponData?.couponId && data.data?.studentId) {
        try {
          await fetch(`${API_BASE}/fees/${schoolId}/coupons/${couponData.couponId}/use`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: data.data.studentId, discount: couponDiscount })
          });
        } catch { }
      }

      setToast({
        type: 'success',
        msg: mode === 'edit'
          ? `Student ${form.name} updated successfully!`
          : `Student ${form.name} created! ID: ${data.data?.studentId}, Roll: ${data.data?.rollNumber}, Sec: ${data.data?.section}`
      });
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

  const handleUpdateChanges = () => {
    if (!validateForm()) {
      setToast({ type: 'error', msg: 'Please fix the highlighted errors' });
      return;
    }

    const changes = [];
    const fieldsToCompare = [
      { key: 'name', label: 'Full Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'aadhaarNumber', label: 'Aadhaar Number' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'motherName', label: "Mother's Name" },
      { key: 'addressLine1', label: 'Street / House / Village' },
      { key: 'addressCountryId', label: 'Country', map: (id) => countries.find(c => String(c.id) === String(id))?.name || id },
      { key: 'addressStateId', label: 'State', map: (id) => geoStates.find(s => String(s.id) === String(id))?.name || id },
      { key: 'addressDistrict', label: 'District' },
      { key: 'addressCity', label: 'City / Village' },
      { key: 'addressPincode', label: 'Pincode' },
      { key: 'contact', label: 'Mobile Number' },
      { key: 'alternativeContact', label: 'Alternative Number' },
      { key: 'email', label: 'Email ID' },
      { key: 'className', label: 'Class' },
      { key: 'studentType', label: 'Student Type' },
      { key: 'admissionDate', label: 'Admission Date' },
      { key: 'tcNumber', label: 'TC Number' },
      { key: 'transportEnabled', label: 'Transport Enabled', map: (val) => val ? 'Yes' : 'No' },
      { key: 'transportRadius', label: 'Transport Radius' },
    ];

    fieldsToCompare.forEach(({ key, label, map }) => {
      const initialValue = initialForm ? initialForm[key] : undefined;
      const currentValue = form[key];

      let displayInitial = initialValue;
      let displayCurrent = currentValue;

      if (map) {
        displayInitial = map(initialValue);
        displayCurrent = map(currentValue);
      }

      if (String(displayInitial) !== String(displayCurrent)) {
        changes.push({
          label,
          old: displayInitial || 'Empty',
          new: displayCurrent || 'Empty',
        });
      }
    });

    // Compare enrolled subjects
    const initialSubjects = initialForm?.enrolledSubjects?.map(s => s.id).sort().join(',') || '';
    const currentSubjects = form.enrolledSubjects.map(s => s.id).sort().join(',') || '';
    if (initialSubjects !== currentSubjects) {
      changes.push({
        label: 'Enrolled Subjects',
        old: initialForm?.enrolledSubjects?.map(s => s.name).join(', ') || 'None',
        new: form.enrolledSubjects.map(s => s.name).join(', ') || 'None',
      });
    }

    if (changes.length > 0) {
      setDiffData(changes);
      setShowDiffModal(true);
    } else {
      setToast({ type: 'info', msg: 'No changes detected to save.' });
    }
  };

  const confirmSubmit = async () => {
    setShowDiffModal(false);
    await handleSubmit();
  };

  const goBack = () => { if (onBack) onBack(); else navigate(-1); };

  /* ───────────── Section renderers ───────────── */

  const renderPersonalSection = () => (
    <div className="space-y-6">
      {/* Profile Image Upload */}
      <div className="flex flex-col items-center gap-4 py-4 bg-white/5 rounded-2xl border border-white/5 mb-2">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden bg-slate-900 group-hover:border-primary/50 transition-all">
            {form.profileImageUrl ? (
              <img src={`${SERVER_ROOT}${form.profileImageUrl}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-slate-600 group-hover:text-primary/50 transition-all" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex gap-1">
            {form.profileImageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center cursor-pointer shadow-lg transition-all border-2 border-slate-900"
              >
                <X size={14} className="text-white" />
              </button>
            )}
            <label className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary-hover transition-all border-2 border-slate-900">
              <Plus size={16} className="text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-white">Student Photograph</p>
          <p className="text-[10px] text-slate-500 mt-1">PNG, JPG or WebP (Max 5MB)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name *" error={errors.name}>
          <input className={inp(errors.name)} placeholder="e.g. Rahul Sharma"
            autoComplete="off"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Date of Birth *" error={errors.dob}>
          <input type="date" className={inp(errors.dob)} value={form.dob}
            max={today()} onChange={e => set('dob', e.target.value)} />
        </Field>
        <Field label="Gender *" error={errors.gender}>
          <select
            className={`${inp(errors.gender)} bg-slate-900`}
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
          >
            <option value="" disabled className="bg-slate-800 text-white">Select gender</option>
            <option value="Male" className="bg-slate-800 text-white">Male</option>
            <option value="Female" className="bg-slate-800 text-white">Female</option>
            <option value="Other" className="bg-slate-800 text-white">Other</option>
          </select>
        </Field>
        <Field label="Aadhaar Number" error={errors.aadhaarNumber}>
          <input className={inp(errors.aadhaarNumber)} placeholder="12-digit Aadhaar" maxLength={12}
            autoComplete="off"
            value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Father's Name">
          <input className={inp()} placeholder="Father's full name"
            autoComplete="off"
            value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
        </Field>
        <Field label="Mother's Name">
          <input className={inp()} placeholder="Mother's full name"
            autoComplete="off"
            value={form.motherName} onChange={e => set('motherName', e.target.value)} />
        </Field>
      </div>

    </div>
  );

  const renderContactSection = () => (
    <div className="space-y-6">
      {/* ── Address Section ── */}
      <div>
        <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <MapPin size={14} className="text-primary" /> Address Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full address line */}
          <div className="md:col-span-2">
            <Field label="Street / House / Village">
              <input className={inp()} placeholder="House No, Street, Village/Area"
                autoComplete="off"
                value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
            </Field>
          </div>

          {/* Country */}
          <Field label="Country">
            <select
              className={`${inp()} bg-slate-900`}
              value={form.addressCountryId}
              onChange={e => {
                const c = countries.find(x => String(x.id) === e.target.value);
                setForm(f => ({
                  ...f,
                  addressCountryId: e.target.value,
                  addressCountryCode: c?.code || '',
                  addressPhoneCode: c?.phone_code || '+91',
                  addressStateId: '',
                  addressState: '',
                  addressDistrict: '',
                }));
              }}
            >
              <option value="" disabled className="bg-slate-800 text-white">Select country</option>
              {countries.map(c => (
                <option key={c.id} value={String(c.id)} className="bg-slate-800 text-white">
                  {c.name} ({c.phone_code})
                </option>
              ))}
            </select>
          </Field>

          {/* State */}
          <Field label="State">
            <select
              className={`${inp()} bg-slate-900`}
              value={form.addressStateId}
              disabled={!form.addressCountryId || loadingStates}
              onChange={e => {
                const s = geoStates.find(x => String(x.id) === e.target.value);
                setForm(f => ({
                  ...f,
                  addressStateId: e.target.value,
                  addressState: s?.name || '',
                  addressDistrict: '',
                }));
              }}
            >
              <option value="" disabled className="bg-slate-800 text-white">
                {loadingStates ? 'Loading…' : 'Select state'}
              </option>
              {geoStates.map(s => (
                <option key={s.id} value={String(s.id)} className="bg-slate-800 text-white">{s.name}</option>
              ))}
            </select>
          </Field>

          {/* District */}
          <Field label="District">
            <select
              className={`${inp()} bg-slate-900`}
              value={form.addressDistrict}
              disabled={!form.addressStateId || loadingDistricts}
              onChange={e => set('addressDistrict', e.target.value)}
            >
              <option value="" disabled className="bg-slate-800 text-white">
                {loadingDistricts ? 'Loading…' : 'Select district'}
              </option>
              {districts.map(d => (
                <option key={d.id} value={d.name} className="bg-slate-800 text-white">{d.name}</option>
              ))}
            </select>
          </Field>

          {/* City */}
          <Field label="City / Village">
            <input className={inp()} placeholder="City or village"
              autoComplete="off"
              value={form.addressCity} onChange={e => set('addressCity', e.target.value)} />
          </Field>

          {/* Pincode */}
          <Field label="Pincode">
            <input className={inp()} placeholder="6-digit pincode" maxLength={6}
              autoComplete="off"
              value={form.addressPincode} onChange={e => set('addressPincode', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
      </div>

      {/* ── Contact Section ── */}
      <div>
        <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Phone size={14} className="text-green-400" /> Contact Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Mobile Number *" error={errors.contact}>
            <div className="flex">
              <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm whitespace-nowrap">
                {form.addressPhoneCode || '+91'}
              </span>
              <input className={inp(errors.contact) + ' rounded-l-none'} placeholder="Mobile number"
                autoComplete="off"
                maxLength={10}
                value={form.contact}
                onChange={e => set('contact', e.target.value.replace(/\D/g, ''))} />
            </div>
          </Field>
          <Field label="Alternative Number (optional)" error={errors.alternativeContact}>
            <div className="flex">
              <span className="flex items-center px-3 bg-slate-700 border border-r-0 border-white/10 rounded-l-lg text-slate-400 text-sm whitespace-nowrap">
                {form.addressPhoneCode || '+91'}
              </span>
              <input className={inp(errors.alternativeContact) + ' rounded-l-none'} placeholder="Alternate number"
                autoComplete="off"
                maxLength={10}
                value={form.alternativeContact}
                onChange={e => set('alternativeContact', e.target.value.replace(/\D/g, ''))} />
            </div>
          </Field>
          <Field label="Email ID" error={errors.email}>
            <input type="email" className={inp(errors.email)} placeholder="student@email.com"
              autoComplete="off"
              value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
        </div>
      </div>

    </div>
  );

  const renderAcademicSection = () => (
    <div className="space-y-5">
      {/* Auto-generated info cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Class *" error={errors.className}>
          <select
            className={`${inp(errors.className)} bg-slate-900`}
            value={form.className}
            onChange={e => handleClassChange(e.target.value)}
          >
            <option value="" disabled className="bg-slate-800 text-white">Select class</option>
            {classes.map(c => {
              const name = typeof c === 'string' ? c : (c.name || c.className);
              return (
                <option key={name} value={name} className="bg-slate-800 text-white">
                  {name}
                </option>
              );
            })}
          </select>
        </Field>
        {/* Student Type — locked for Class ≤9, choosable for Class 10+ */}
        {form.className && (
          <Field label="Student Type">
            {getClassNum(form.className) <= 9 && getClassNum(form.className) > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-sm text-primary font-medium">Regular</span>
                <span className="text-[10px] text-slate-500 ml-auto">Auto-assigned for Class {form.className}</span>
              </div>
            ) : (
              <select
                className={`${inp()} bg-slate-900`}
                value={form.studentType}
                onChange={e => set('studentType', e.target.value)}
              >
                <option value="Regular" className="bg-slate-800 text-white">Regular</option>
                <option value="Private" className="bg-slate-800 text-white">Private</option>
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
        <Field label="TC Number (optional)">
          <input className={inp()} placeholder="Transfer certificate number"
            value={form.tcNumber} onChange={e => set('tcNumber', e.target.value)} />
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
                      ? 'bg-primary/10 border-primary/40 text-white ring-1 ring-primary/20 shadow-lg shadow-primary/10'
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
                        ? 'bg-primary border-primary/60 text-white'
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
              <div className="mt-6 bg-gradient-to-r from-success/20 via-primary/10 to-transparent border border-success/20 rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <DollarSign size={20} className="text-success" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subject Fees</p>
                    <p className="text-sm text-success font-medium">{form.enrolledSubjects.length} subjects & activities enrolled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black tracking-tighter ${couponDiscount > 0 ? 'text-slate-500 line-through text-lg' : 'text-success'}`}>₹{form.totalFees.toLocaleString('en-IN')}</p>
                  {couponDiscount > 0 && <p className="text-2xl font-black text-success tracking-tighter">₹{finalFees.toLocaleString('en-IN')}</p>}
                  <p className="text-[10px] text-slate-500 font-bold">{couponDiscount > 0 ? 'AFTER DISCOUNT' : 'ESTIMATED TOTAL'}</p>
                </div>
              </div>

              {/* Referral Coupon */}
              <div className="mt-4 p-4 bg-violet-500/5 border border-violet-500/15 rounded-2xl space-y-3">
                <p className="text-xs font-semibold text-violet-400 flex items-center gap-2"><Tag size={14} /> Referral / Discount Coupon</p>
                <div className="flex gap-2">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white uppercase"
                    placeholder="Enter coupon code..."
                    value={referralCode}
                    onChange={e => { setReferralCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(''); }}
                  />
                  <button type="button" onClick={() => validateCoupon(referralCode)} disabled={couponLoading || !referralCode.trim()}
                    className="px-4 py-2 bg-primary hover:brightness-110 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1">
                    {couponLoading ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />} Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle size={12} /> {couponError}</p>}
                {couponData && (
                  <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-success" />
                      <div>
                        <p className="text-xs font-bold text-success">{couponData.couponName}</p>
                        <p className="text-[10px] text-slate-500">
                          {couponData.discountType === 'percentage' ? `${couponData.discountValue}% off` : `₹${parseFloat(couponData.discountValue).toLocaleString('en-IN')} off`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-success">-₹{couponDiscount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderTransportSection = () => (
    <div className="space-y-5">
      <div
        onClick={() => set('transportEnabled', !form.transportEnabled)}
        className={`cursor-pointer flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${form.transportEnabled
          ? 'bg-secondary/15 border-secondary/50'
          : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${form.transportEnabled ? 'bg-secondary/20' : 'bg-slate-700'
          }`}>
          <Bus size={22} className={form.transportEnabled ? 'text-secondary' : 'text-slate-500'} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">School Transport</p>
          <p className="text-sm text-slate-400">Student requires school bus facility</p>
        </div>
        {/* Toggle */}
        <div className={`relative w-12 h-6 rounded-full transition-colors ${form.transportEnabled ? 'bg-secondary' : 'bg-slate-600'
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

  const sectionContent = {
    personal: renderPersonalSection(),
    contact: renderContactSection(),
    academic: renderAcademicSection(),
    transport: renderTransportSection(),
  };

  /* ───────────── Render ───────────── */
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-slate-900/80 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center">
                <User size={14} className="text-primary" />
              </div>
              {mode === 'edit' ? 'Edit Student Profile' : 'New Student Admission'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <button
              onClick={() => handleUpdateChanges()}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary hover:brightness-110 text-white shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
            >
              <Save size={16} />
              Update Changes
            </button>
          )}
          <button onClick={goBack} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">
        {/* Left nav */}
        <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0 sticky top-24 self-start">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === id
                ? 'bg-primary/20 text-primary border border-primary/30'
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
                ? 'bg-primary/20 text-primary border border-primary/30'
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
                  <Icon size={16} className="text-primary" /> {label}
                </h2>
                {sectionContent[id]}
              </div>
              {activeSection === id && id !== 'transport' && (
                <div className="flex justify-end">
                  <button onClick={handleNext}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all border border-white/10">
                    Next →
                  </button>
                </div>
              )}
              {activeSection === id && id === 'transport' && (
                <div className="flex justify-end">
                  <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:brightness-110 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20">
                    {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Saving…' : (mode === 'edit' ? 'Save Changes' : 'Create Student')}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ShieldAlert size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Review Changes</h2>
                <p className="text-sm text-slate-400">Are you sure you want to update these fields?</p>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto mb-8 space-y-2 pr-2 custom-scrollbar">
              {diffData.map((d, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/[0.03]">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">{d.label}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-accent line-through opacity-60 truncate max-w-[150px]">{String(d.old || 'none')}</span>
                    <ArrowRight size={12} className="text-slate-600 flex-shrink-0" />
                    <span className="text-xs text-success font-medium truncate">{String(d.new || 'none')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDiffModal(false)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
              >
                No, Keep Editing
              </button>
              <button
                onClick={() => confirmSubmit()}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary hover:brightness-110 text-white shadow-lg shadow-primary/25 transition-all"
              >
                Yes, Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          onAnimationComplete={() => setTimeout(() => setToast(null), 3000)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium ${toast.type === 'success'
            ? 'bg-success/20 border border-success/30 text-success'
            : 'bg-accent/20 border border-accent/30 text-accent'
            }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.msg}
        </motion.div>
      )}
    </div>
  );
}

