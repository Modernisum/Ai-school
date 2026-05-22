import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import {
  CheckCircle, User, GraduationCap, Users, Truck, FileUp, Calendar, ClipboardList, AlertCircle, Heart, Phone
} from 'lucide-react';
import FormWidget from '../../../components/ui/FormWidget';
import DocumentUploadStep from '../../../components/ocr/DocumentUploadStep';
import PinCodeAutoFill from '../../../components/geo/PinCodeAutoFill';
import FeeBreakdownWidget from '../../../components/fees/FeeBreakdownWidget';
import { useAgeCalculator } from '../../../hooks/useAgeCalculator';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { useGetClassesQuery } from '../../academics/api/academicApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => getSchoolIdFromStorage() || "";

export default function AddStudentPage() {
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || (pathname.includes('/leave') ? 'leave' : (pathname.includes('/edit') ? 'edit' : 'add'));
  const studentId = searchParams.get('studentId');

  const [activeSection, setActiveSection] = useState(mode === 'leave' ? 'request' : 'identity');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showOcrStep, setShowOcrStep] = useState(mode === 'add' && !studentId);
  const [ocrFields, setOcrFields] = useState({});

  const { data: classData } = useGetClassesQuery(schoolId, { skip: !schoolId });
  const classOptions = useMemo(() => {
    return (classData || []).map(c => ({ label: c.className || c.name || c, value: c.className || c.id || c }));
  }, [classData]);

  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
      name: '', dob: '', gender: '', bloodGroup: '', religion: '', category: 'General', aadhaarNumber: '',
      class: '', section: '', rollNumber: '', studentType: 'Regular', prevSchool: '',
      fatherName: '', fatherOccupation: '', motherName: '', motherOccupation: '',
      phone: '', altPhone: '', email: '', address: '',
      transportMode: 'none', busRoute: '',
      leaveType: 'casual', fromDate: '', toDate: '', reason: '', attachments: [],
      caste: '', medicalHistory: '', allergies: '', emergencyContact: '',
    }
  });

  const watchedClass = watch('class');
  const watchedSection = watch('section');
  const watchedDob = watch('dob');
  const { ageString } = useAgeCalculator(watchedDob);

  useEffect(() => {
    if (mode === 'edit' && studentId) {
      setIsLoading(true);
      fetch(`${API_BASE}/students/${schoolId}/${studentId}`)
        .then(r => r.json())
        .then(data => reset(data.data || data))
        .catch(() => setFeedback({ type: 'error', msg: 'Load failed' }))
        .finally(() => setIsLoading(false));
    }
  }, [mode, studentId, schoolId, reset]);

  // ─── Space Responsibilities for Selected Class ──────────────────────────────
  const [selectedOptionalResps, setSelectedOptionalResps] = useState([]);
  const [spaceResponsibilities, setSpaceResponsibilities] = useState([]);
  const [fetchingResps, setFetchingResps] = useState(false);

  useEffect(() => {
    if (!watchedClass || !watchedSection) { setSpaceResponsibilities([]); return; }
    const spaceId = `${watchedClass}-${watchedSection}`;
    let cancelled = false;
    setFetchingResps(true);
    fetch(`${API_BASE}/responsibility/${schoolId}/spaces/${spaceId}/responsibilities`)
      .then(r => r.json())
      .then(json => {
        if (!cancelled) {
          const data = json?.data || json || [];
          setSpaceResponsibilities(Array.isArray(data) ? data : []);
          setFetchingResps(false);
        }
      })
      .catch(() => { if (!cancelled) { setSpaceResponsibilities([]); setFetchingResps(false); } });
    return () => { cancelled = true; };
  }, [watchedClass, watchedSection, schoolId]);

  const mandatoryResps = useMemo(() =>
    spaceResponsibilities.filter(r => {
      const mandatory = r.isMandatory !== undefined ? r.isMandatory : r.data?.mandatory;
      return mandatory === true || mandatory === 'true';
    }),
  [spaceResponsibilities]);

  const optionalResps = useMemo(() =>
    spaceResponsibilities.filter(r => {
      const mandatory = r.isMandatory !== undefined ? r.isMandatory : r.data?.mandatory;
      return mandatory !== true && mandatory !== 'true';
    }),
  [spaceResponsibilities]);

  const totalMandatoryFees = useMemo(() =>
    mandatoryResps.reduce((sum, r) => sum + (parseFloat(r.studentFee || r.student_fee || 0) || 0), 0),
  [mandatoryResps]);

  // ─── OCR Auto-Fill Handler ─────────────────────────────────────────────────
  const handleOcrAutoFill = useCallback((extracted) => {
    setOcrFields(extracted);
    if (extracted.name) setValue('name', extracted.name);
    if (extracted.dob) setValue('dob', extracted.dob);
    if (extracted.gender) setValue('gender', extracted.gender);
    if (extracted.aadhaarNumber) setValue('aadhaarNumber', extracted.aadhaarNumber);
    if (extracted.address) setValue('address', extracted.address);
    if (extracted.fatherName) setValue('fatherName', extracted.fatherName);
    if (extracted.motherName) setValue('motherName', extracted.motherName);
    setShowOcrStep(false);
    setActiveSection('identity');
  }, [setValue]);

  const handleOcrSkip = useCallback(() => {
    setShowOcrStep(false);
    setActiveSection('identity');
  }, []);

  // ─── Pincode Auto-Fill ─────────────────────────────────────────────────────
  const handleAddressFilled = useCallback((location) => {
    if (location.city && !watch('address')) {
      setValue('address', `${location.city}, ${location.state}`);
    }
  }, [setValue, watch]);

  // ─── Toggle Optional Responsibility ─────────────────────────────────────────
  const handleToggleOptional = useCallback((rId) => {
    setSelectedOptionalResps(prev =>
      prev.includes(rId) ? prev.filter(v => v !== rId) : [...prev, rId]
    );
  }, []);

  // ─── Schema Definition ─────────────────────────────────────────────────────
  const STUDENT_SCHEMA = useMemo(() => [
    {
      id: 'identity', label: 'Identity & Core Information', icon: User,
      description: 'Student personal and family details.',
      fields: [
        { name: 'name', label: 'Full Name of Student', type: 'text', required: true },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: true,
          helperText: ageString ? `Age: ${ageString}` : '' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
        { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { name: 'caste', label: 'Caste / Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Other'], required: true },
        { name: 'religion', label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Other'] },
        { name: 'aadhaarNumber', label: 'Aadhaar Card Number', type: 'text' },
        { name: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
        { name: 'fatherOccupation', label: "Father's Profession", type: 'text' },
        { name: 'motherName', label: "Mother's Full Name", type: 'text' },
        { name: 'motherOccupation', label: "Mother's Profession", type: 'text' },
        { name: 'phone', label: 'Primary Mobile Number', type: 'tel', required: true },
        { name: 'email', label: 'Parent Email Address', type: 'email' },
        { name: 'emergencyContact', label: 'Emergency Contact Number', type: 'tel' },
        { name: 'address', label: 'Complete Residential Address', type: 'textarea', className: 'md:col-span-2' },
        { name: 'image_url', label: 'Upload Student Photo', type: 'image', fieldName: 'profile_photo' },
      ]
    },
    {
      id: 'enrollment', label: 'Academic Enrollment & Fee Details', icon: GraduationCap,
      description: 'Configure class, section, admission details and review fee structure.',
      fields: [
        { name: 'class', label: 'Class / Grade', type: 'select', options: classOptions, required: true },
        { name: 'section', label: 'Section', type: 'select', options: ['A', 'B', 'C', 'D', 'E'] },
        { name: 'rollNumber', label: 'Roll Number', type: 'text' },
        { name: 'admissionNumber', label: 'Admission Number', type: 'text', required: true },
        { name: 'admissionDate', label: 'Date of Admission', type: 'date', required: true },
        { name: 'studentType', label: 'Enrollment Type', type: 'select', options: ['Regular', 'Private', 'Transfer'], required: true },
        { name: 'prevSchool', label: 'Previous School Attended', type: 'text', className: 'md:col-span-3' },
        { name: 'medicalHistory', label: 'Medical History / Conditions', type: 'textarea', className: 'md:col-span-3' },
        { name: 'allergies', label: 'Allergies (if any)', type: 'textarea', className: 'md:col-span-3' },
      ],
      customContent: (
        <div className="mt-8 pt-8 border-t border-[var(--glass-border)] space-y-6">
          {/* Fee Breakdown Widget */}
          <FeeBreakdownWidget
            mandatoryFees={mandatoryResps}
            optionalFees={optionalResps}
            selectedOptionals={selectedOptionalResps}
            onToggleOptional={handleToggleOptional}
          />

          {/* Manual Fee Entry */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={16} className="text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Additional Fee Components</h4>
            </div>
            <div className="overflow-x-auto border border-[var(--glass-border)] rounded-2xl bg-[var(--bg-main)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] border-b border-[var(--glass-border)]">
                    <th className="px-4 py-2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Fee Component</th>
                    <th className="px-4 py-2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Monthly Amount (₹)</th>
                    <th className="px-4 py-2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Concession</th>
                    <th className="px-4 py-2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-white/[0.01] border-b border-[var(--glass-border)]">
                    <td className="px-4 py-3"><input placeholder="e.g. Tuition" className="bg-transparent border-none text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none w-full" /></td>
                    <td className="px-4 py-3"><input placeholder="0.00" className="bg-transparent border-none text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none w-full" /></td>
                    <td className="px-4 py-3"><input placeholder="0%" className="bg-transparent border-none text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none w-full" /></td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'logistics', label: 'Logistics & Service Details', icon: Truck,
      description: 'Set up transport mode, route assignment and upload essential documents.',
      fields: [
        { name: 'transportMode', label: 'Transport Mode', type: 'select', options: ['None', 'Bus', 'Self', 'Van'] },
        { name: 'busRoute', label: 'Assigned Bus Route', type: 'text' },
        { name: 'attachments', label: 'Upload Documents (Aadhaar, TC, Birth Certificate)', type: 'file', multiple: true, className: 'md:col-span-3' },
      ]
    }
  ], [classOptions, mandatoryResps, optionalResps, selectedOptionalResps, totalMandatoryFees,
      fetchingResps, spaceResponsibilities, watchedClass, watchedSection, ageString, handleToggleOptional]);

  const STUDENT_LEAVE_SCHEMA = useMemo(() => [
    {
      id: 'request', label: 'Leave Authorization & Request', icon: Calendar,
      fields: [
        { name: 'leaveType', label: 'Type of Leave', type: 'select', options: ['Casual', 'Medical', 'Emergency'], required: true },
        { name: 'fromDate', label: 'Vacancy Start Date', type: 'date', required: true },
        { name: 'toDate', label: 'Resume Date', type: 'date', required: true },
        { name: 'reason', label: 'Leave Notes / Purpose', type: 'textarea', required: true },
        { name: 'attachments', label: 'Evidence / Medical Certificate', type: 'file', multiple: true },
      ]
    }
  ], []);

  const activeSchema = mode === 'leave' ? STUDENT_LEAVE_SCHEMA : STUDENT_SCHEMA;

  const onFormSubmit = async (data) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const url = mode === 'leave' ? `${API_BASE}/leave/${schoolId}` : `${API_BASE}/students/${schoolId}${mode === 'edit' ? `/${studentId}` : ''}`;
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const payload = mode === 'leave'
        ? { ...data, applicant_id: studentId, applicant_type: 'student' }
        : { ...data, optionalResponsibilityIds: selectedOptionalResps, mandatoryFeeTotal: totalMandatoryFees };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Synchronization interrupted");

      setFeedback({ type: 'success', msg: 'System records updated successfully!' });
      setTimeout(() => navigate('/dashboard/student/all'), 1500);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (showOcrStep) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="border border-[var(--glass-border)] rounded-2xl bg-[var(--bg-secondary)] p-6 shadow-2xl">
          <DocumentUploadStep
            entityType="student"
            onAutoFill={handleOcrAutoFill}
            onSkip={handleOcrSkip}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {feedback && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-micro font-black uppercase tracking-widest mb-4 ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <CheckCircle size={14} /> <span>{feedback.msg}</span>
        </div>
      )}

      <FormWidget
        title={mode === 'leave' ? "Leave Authorization Request" : "Student Admission Registration"}
        description={mode === 'leave' ? "Submit a formal leave request with supporting documentation" : "Register a new student with complete academic and personal information"}
        sections={activeSchema}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        control={control}
        onSubmit={handleSubmit(onFormSubmit)}
        onCancel={() => navigate ? navigate(-1) : null}
        isLoading={isLoading}
        submitLabel={mode === 'leave' ? 'AUTHORIZE' : 'SAVE_RECORD'}
        layout={mode === 'leave' ? 'default' : 'sidebar'}
        size={mode === 'leave' ? 'small' : 'large'}
        columns={3}
        dense
      />
    </div>
  );
}
