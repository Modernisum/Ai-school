import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Briefcase, GraduationCap,
  Shield, Calendar, FileText, DollarSign, Award, CheckCircle, AlertCircle,
  Building, MapPin, ClipboardList, ShieldCheck, FileUp, Users, LayoutGrid, CheckSquare, Heart, TrendingUp
} from 'lucide-react';
import FormWidget from '../../../components/ui/FormWidget';
import DocumentUploadStep from '../../../components/ocr/DocumentUploadStep';
import PinCodeAutoFill from '../../../components/geo/PinCodeAutoFill';
import SalaryBreakdownWidget from '../../../components/salary/SalaryBreakdownWidget';
import { useAgeCalculator } from '../../../hooks/useAgeCalculator';
import { getSchoolIdFromStorage, callApiWithBackoff } from '../../../utils/api';
import { useAddEmployeeMutation } from '../api/employeeApi';
import { useGetSpacesQuery } from '../../infrastructure/api/infrastructureApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => getSchoolIdFromStorage() || "";

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [addEmployee] = useAddEmployeeMutation();

  const mode = searchParams.get('mode') || (pathname.includes('/leave') ? 'leave' : (pathname.includes('/edit') ? 'edit' : 'add'));
  const employeeId = searchParams.get('employeeId');

  const [activeSection, setActiveSection] = useState(mode === 'leave' ? 'request' : 'personal');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showOcrStep, setShowOcrStep] = useState(mode === 'add' && !employeeId);
  const [ocrFields, setOcrFields] = useState({});

  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      name: '', dob: '', gender: '', fatherName: '', motherName: '', maritalStatus: 'Single', religion: '', 
      aadhaarNumber: '', panNumber: '',
      phone: '', altPhone: '', email: '', address: '', emergencyContact: '',
      employeeType: '', department: '', designation: '', 
      baseSalary: '', salaryType: 'Monthly', joinDate: new Date().toISOString().split('T')[0],
      reportingManager: '', probationPeriod: '6 Months',
      educationLevel: '', institutionName: '', stream: '', passingYear: '', grade: '',
      experienceYears: '', prevOrg: '', prevDesignation: '',
      leaveType: 'Casual', fromDate: '', toDate: '', reason: '', attachments: [], 
      priority: 'Normal', coverageRequired: true, handoverNotes: '',
      bloodGroup: '', bankAccountNumber: '', bankIfscCode: '',
      experienceStatus: 'Fresher', experienceIncrementPercent: 0,
    }
  });

  const watchedDob = watch('dob');
  const watchedExpStatus = watch('experienceStatus');
  const watchedBaseSalary = watch('baseSalary');
  const watchedExpIncPct = watch('experienceIncrementPercent');
  const { ageString } = useAgeCalculator(watchedDob);

  useEffect(() => {
    if (mode === 'edit' && employeeId) {
      setIsLoading(true);
      fetch(`${API_BASE}/employees/${schoolId}/${employeeId}`)
        .then(r => r.json())
        .then(data => reset(data.data || data))
        .catch(() => setFeedback({ type: 'error', msg: 'Failed to synchronize record' }))
        .finally(() => setIsLoading(false));
    }
  }, [mode, employeeId, schoolId, reset]);

  // ─── Spaces & Responsibilities ────────────────────────────────────────────
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedResponsibilities, setSelectedResponsibilities] = useState([]);
  const { data: spacesData } = useGetSpacesQuery({ schoolId }, { skip: !schoolId || mode === 'leave' });
  const spaceList = useMemo(() => {
    if (!spacesData) return [];
    const data = spacesData.data || spacesData || [];
    return Array.isArray(data) ? data : [];
  }, [spacesData]);
  const spaceOptions = useMemo(() =>
    spaceList.map(s => ({ label: s.name || s.space_name || s.spaceId || s, value: s.spaceId || s.id || s.name || s })),
  [spaceList]);

  const [spaceResps, setSpaceResps] = useState({});
  useEffect(() => {
    if (!selectedSpaces.length) { setSpaceResps({}); return; }
    let cancelled = false;
    const fetchAll = async () => {
      const results = {};
      for (const spaceId of selectedSpaces) {
        try {
          const res = await fetch(`${API_BASE}/responsibility/${schoolId}/spaces/${spaceId}/responsibilities`);
          const json = await res.json();
          results[spaceId] = json?.data || json || [];
        } catch { results[spaceId] = []; }
      }
      if (!cancelled) setSpaceResps(results);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [selectedSpaces.join(','), schoolId]);

  const mergedResponsibilities = useMemo(() => {
    const seen = new Map();
    Object.values(spaceResps).flat().forEach(r => {
      const id = r.responsibilityId || r.id;
      if (id) seen.set(id, r);
    });
    return Array.from(seen.values());
  }, [spaceResps]);

  const baseSalaryForWidget = useMemo(() => {
    if (watchedBaseSalary) return watchedBaseSalary;
    if (mergedResponsibilities.length > 0) {
      const r = mergedResponsibilities[0];
      return r.monthlyPrice || r.monthly_price || 0;
    }
    return 0;
  }, [watchedBaseSalary, mergedResponsibilities]);

  // ─── OCR Auto-Fill Handler ─────────────────────────────────────────────────
  const handleOcrAutoFill = useCallback((extracted) => {
    setOcrFields(extracted);
    if (extracted.name) setValue('name', extracted.name);
    if (extracted.dob) setValue('dob', extracted.dob);
    if (extracted.gender) setValue('gender', extracted.gender);
    if (extracted.aadhaarNumber) setValue('aadhaarNumber', extracted.aadhaarNumber);
    if (extracted.panNumber) setValue('panNumber', extracted.panNumber);
    if (extracted.address) setValue('address', extracted.address);
    if (extracted.fatherName) setValue('fatherName', extracted.fatherName);
    if (extracted.motherName) setValue('motherName', extracted.motherName);
    setShowOcrStep(false);
    setActiveSection('personal');
  }, [setValue]);

  const handleOcrSkip = useCallback(() => {
    setShowOcrStep(false);
    setActiveSection('personal');
  }, []);

  // ─── Pincode Auto-Fill ─────────────────────────────────────────────────────
  const handleAddressFilled = useCallback((location) => {
    if (location.city && !watch('address')) {
      setValue('address', `${location.city}, ${location.state}`);
    }
  }, [setValue, watch]);

  const spaceResponsibilityContent = (
    <div className="space-y-4">
      {/* Salary Preview */}
      <SalaryBreakdownWidget
        baseSalary={baseSalaryForWidget}
        spacesCount={selectedSpaces.length || 1}
        experienceIncrementPercent={watchedExpIncPct}
        onIncrementChange={(val) => setValue('experienceIncrementPercent', val)}
      />

      {/* Space Selection */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Select Assigned Spaces (e.g. Classrooms / Labs)
        </label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-white/5 rounded-xl bg-white/[0.02] p-3">
          {spaceOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedSpaces(prev =>
                prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
              )}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                selectedSpaces.includes(opt.value)
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {spaceOptions.length === 0 && (
            <span className="text-xs text-slate-600">No spaces available</span>
          )}
        </div>
      </div>

      {/* Responsibility Selection */}
      {mergedResponsibilities.length > 0 && (
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Assign Responsibilities (Subjects/Tasks) ({mergedResponsibilities.length})
          </label>
          <div className="border border-white/5 rounded-xl bg-white/[0.02] max-h-48 overflow-y-auto">
            {mergedResponsibilities.map(resp => {
              const rId = resp.responsibilityId || resp.id;
              const isSelected = selectedResponsibilities.includes(rId);
              return (
                <label key={rId} className={`flex items-center gap-3 px-3 py-2.5 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/[0.02] ${isSelected ? 'bg-primary/10' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => setSelectedResponsibilities(prev =>
                      prev.includes(rId) ? prev.filter(v => v !== rId) : [...prev, rId]
                    )}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{resp.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {resp.employeeType || resp.employee_type} · ₹{resp.monthlyPrice || resp.monthly_price || 0}/mo
                      {resp.isMandatory !== undefined && (resp.isMandatory ? ' · Mandatory' : ' · Optional')}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Employee Schema ──────────────────────────────────────────────────────
  const EMPLOYEE_SCHEMA = useMemo(() => [
    {
      id: 'personal', label: 'Identity', icon: User,
      fields: [
        { name: 'name', label: 'Full Legal Name', type: 'text', required: true, icon: User },
        { name: 'dob', label: 'Birth Date', type: 'date', required: true, icon: Calendar,
          helperText: ageString ? `Age: ${ageString}` : '' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
        { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
        { name: 'religion', label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain', 'Buddhist', 'Other'] },
        { name: 'aadhaarNumber', label: 'Aadhaar ID', type: 'text', icon: ShieldCheck },
        { name: 'panNumber', label: 'PAN Card No', type: 'text', icon: ShieldCheck },
        { name: 'fatherName', label: "Father's Name", type: 'text' },
        { name: 'image_url', label: 'Staff Photo', type: 'image', fieldName: 'profile_photo', className: 'md:col-span-1' },
      ]
    },
    {
      id: 'contact', label: 'Contact', icon: Phone,
      fields: [
        { name: 'phone', label: 'Primary Contact', type: 'tel', required: true, icon: Phone },
        { name: 'altPhone', label: 'Alternative No', type: 'tel', icon: Phone },
        { name: 'email', label: 'Work Email', type: 'email', icon: FileText },
        { name: 'emergencyContact', label: 'Emergency Contact Name / Phone', type: 'text', icon: AlertCircle },
        { name: 'address', label: 'Permanent Address', type: 'textarea', className: 'md:col-span-2' },
      ]
    },
    {
      id: 'bank', label: 'Bank Details', icon: DollarSign,
      description: 'Salary transfer bank account information.',
      fields: [
        { name: 'bankAccountNumber', label: 'Bank Account Number', type: 'text', required: true },
        { name: 'bankIfscCode', label: 'IFSC Code', type: 'text', required: true },
      ]
    },
    {
      id: 'job', label: 'Employment', icon: Building,
      fields: [
        { name: 'employeeType', label: 'Staff Category', type: 'select', required: true, options: ['Teaching', 'Non-Teaching', 'Administrative', 'Management', 'Support'], icon: Briefcase },
        { name: 'department', label: 'Department', type: 'select', options: ['Academic', 'Administration', 'Finance', 'Human Resources', 'Logistics', 'Security', 'IT / Tech', 'Admission Hub', 'Library', 'Sports'] },
        { name: 'designation', label: 'Work Designation', type: 'select', required: true, options: ['Principal', 'Vice Principal', 'HOD', 'Coordinator', 'TGT Teacher', 'PGT Teacher', 'PRT Teacher', 'NTT Teacher', 'Subject Expert', 'Librarian', 'Accountant', 'Lab Assistant', 'Office Assistant', 'Registrar', 'Warden', 'Driver', 'Security Head', 'Support Staff'], icon: Award },
        { name: 'joinDate', label: 'Joining Date', type: 'date', required: true, icon: Calendar },
        { name: 'baseSalary', label: 'Gross Salary', type: 'number', required: true, icon: DollarSign },
        { name: 'salaryType', label: 'Cycle', type: 'select', options: ['Monthly', 'Contractual', 'Part-time', 'Daily Wage'] },
        { name: 'reportingManager', label: 'Functional Reporting', type: 'text' },
        { name: 'probationPeriod', label: 'Probationary Window', type: 'select', options: ['None', '3 Months', '6 Months', '1 Year', '2 Years'] },
      ]
    },
    {
      id: 'salary_meta', label: 'Comp_Intel', icon: DollarSign, type: 'table',
      description: 'DISTRIBUTE_SALARY_COMPONENTS',
      fields: [
        { name: 'componentName', label: 'Pay Head', placeholder: 'e.g. HRA' },
        { name: 'amount', label: 'Fixed Amount', placeholder: '0.00' },
        { name: 'taxable', label: 'Taxable', placeholder: 'Yes/No' },
        { name: 'remarks', label: 'Notes', placeholder: 'N/A' },
      ]
    },
    {
      id: 'academic', label: 'Registry', icon: GraduationCap,
      fields: [
        { name: 'educationLevel', label: 'Highest Qualification', type: 'select', options: ['Diploma', 'Bachelor', 'Master', 'PhD', 'Other'] },
        { name: 'institutionName', label: 'Institution', type: 'text' },
        { name: 'experienceStatus', label: 'Experience Status', type: 'select', options: ['Fresher', 'Experienced'], required: true },
        ...(watchedExpStatus === 'Experienced' ? [
          { name: 'experienceYears', label: 'Work Exp (Years)', type: 'number', icon: Briefcase },
          { name: 'prevOrg', label: 'Previous School / Organization', type: 'text' },
          { name: 'prevDesignation', label: 'Last Designation', type: 'text' },
        ] : []),
        { name: 'attachments', label: 'Verification Docs', type: 'file', multiple: true },
      ]
    },
    {
      id: 'spaces', label: 'Allocations', icon: LayoutGrid,
      description: 'MAP_SPACES_AND_RESPONSIBILITIES',
      fields: [
        { name: '_spacesPlaceholder', label: 'Space & Responsibility Assignment', type: 'custom', hidden: true },
      ],
      customContent: spaceResponsibilityContent
    }
  ], [spaceResponsibilityContent, ageString, watchedExpStatus]);

  const LEAVE_SCHEMA = useMemo(() => [
    {
        id: 'request', label: 'Parameters', icon: FileText,
        fields: [
            { name: 'leaveType', label: 'Category', type: 'select', options: ['Casual', 'Sick', 'Earned', 'Maternity', 'Comp-Off'], required: true },
            { name: 'fromDate', label: 'Start', type: 'date', required: true },
            { name: 'toDate', label: 'End', type: 'date', required: true },
            { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Critical'] },
            { name: 'reason', label: 'Reason Description', type: 'textarea', required: true, className: 'md:col-span-2' },
        ]
    },
    {
        id: 'ops', label: 'Operations', icon: Shield,
        fields: [
            { name: 'coverageRequired', label: 'Is Coverage Required?', type: 'checkbox' },
            { name: 'handoverNotes', label: 'Handover Instructions', type: 'textarea', className: 'md:col-span-2' },
        ]
    }
  ], []);

  const activeSchema = mode === 'leave' ? LEAVE_SCHEMA : EMPLOYEE_SCHEMA;

  const onFormSubmit = async (data) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (mode === 'leave') {
        const payload = { ...data, applicant_id: employeeId || localStorage.getItem('userId'), applicant_type: 'employee', status: 'pending' };
        await callApiWithBackoff(`${API_BASE}/leave/${schoolId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setFeedback({ type: 'success', msg: 'Application queued for approval' });
      } else {
        const payload = {
          ...data,
          baseSalary: parseFloat(data.baseSalary) || 0,
          "permanent address": data.address,
          type: data.employeeType,
          spaces: selectedSpaces,
          responsibilityIds: selectedResponsibilities,
          experienceIncrementPercent: parseFloat(data.experienceIncrementPercent) || 0,
          experienceYears: data.experienceStatus === 'Experienced' ? (parseInt(data.experienceYears) || 0) : 0,
        };
        if (mode === 'edit') {
            await fetch(`${API_BASE}/employees/${schoolId}/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setFeedback({ type: 'success', msg: 'Neural Registry Updated' });
        } else {
            await addEmployee({ schoolId, employeeData: payload }).unwrap();
            setFeedback({ type: 'success', msg: 'Activation Complete' });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err?.message || 'Sync error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (showOcrStep) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="border border-white/5 rounded-2xl bg-white/[0.02] p-6">
          <DocumentUploadStep
            entityType="employee"
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
        <div className={`flex items-center gap-2 px-2 py-1 border rounded-lg text-micro font-black tracking-widest uppercase mb-1 ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {feedback.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <FormWidget
        title={mode === 'leave' ? "LEAVE_PROTOCOL" : "EMPLOYEE_REGISTRY"}
        description={mode === 'edit' ? `MODIFY_NODE: ${employeeId}` : "INITIALIZE_PERSONNEL_IDENTITY"}
        sections={activeSchema}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        control={control}
        onSubmit={handleSubmit(onFormSubmit)}
        onCancel={() => navigate ? navigate(-1) : null}
        isLoading={isLoading}
        submitLabel={mode === 'leave' ? 'COMMIT_REQUEST' : 'SAVE_RECORD'}
        layout={mode === 'leave' ? 'default' : 'sidebar'}
        size={mode === 'leave' ? 'small' : 'large'}
        columns={3}
        dense
      />
    </div>
  );
}
