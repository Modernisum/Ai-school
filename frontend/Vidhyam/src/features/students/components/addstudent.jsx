import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import {
  CheckCircle, User, GraduationCap, Users, Truck, FileUp, Calendar, ClipboardList, AlertCircle
} from 'lucide-react';
import FormWidget from '../../../components/ui/FormWidget';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { useGetClassesQuery } from '../../academics/api/academicApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => getSchoolIdFromStorage() || "";

export default function AddStudentPage() {
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || (pathname.includes('/leave') ? 'leave' : 'add');
  const studentId = searchParams.get('studentId');

  const [activeSection, setActiveSection] = useState(mode === 'leave' ? 'request' : 'identity');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { data: classData } = useGetClassesQuery(schoolId, { skip: !schoolId });
  const classOptions = useMemo(() => {
    return (classData || []).map(c => ({ label: c.className || c.name || c, value: c.className || c.id || c }));
  }, [classData]);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
      name: '', dob: '', gender: '', bloodGroup: '', religion: '', category: 'General', aadhaarNumber: '',
      class: '', section: '', rollNumber: '', studentType: 'Regular', prevSchool: '',
      fatherName: '', fatherOccupation: '', motherName: '', motherOccupation: '',
      phone: '', altPhone: '', email: '', address: '',
      transportMode: 'none', busRoute: '',
      leaveType: 'casual', fromDate: '', toDate: '', reason: '', attachments: []
    }
  });

  const watchedClass = watch('class');
  const watchedSection = watch('section');

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

  const STUDENT_SCHEMA = useMemo(() => [
    {
      id: 'identity', label: 'Identity & Core Information', icon: User,
      description: 'Provide biometric and family details for student identification.',
      fields: [
        { name: 'name', label: 'Full Name of Student', type: 'text', required: true },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
        { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { name: 'religion', label: 'Religion', type: 'select', options: ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Other'] },
        { name: 'category', label: 'Social Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST'], required: true },
        { name: 'aadhaarNumber', label: 'Aadhaar Card Number', type: 'text' },
        { name: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
        { name: 'fatherOccupation', label: "Father's Profession / Occupation", type: 'text' },
        { name: 'motherName', label: "Mother's Full Name", type: 'text' },
        { name: 'motherOccupation', label: "Mother's Profession / Occupation", type: 'text' },
        { name: 'phone', label: 'Primary Mobile Number', type: 'tel', required: true },
        { name: 'email', label: 'Parent Email Address', type: 'email' },
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
      ],
      customContent: (
        <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
          {/* Mandatory Responsibilities */}
          {mandatoryResps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Mandatory Fees (Automatically Applied)</h4>
              </div>
              <div className="border border-amber-500/10 rounded-xl bg-amber-500/[0.02] overflow-hidden">
                {mandatoryResps.map(r => {
                  const fee = parseFloat(r.studentFee || r.student_fee || 0) || 0;
                  return (
                    <div key={r.responsibilityId || r.id} className="flex items-center justify-between px-3 py-2 border-b border-white/5 text-xs">
                      <span className="text-white">{r.name}</span>
                      <span className="text-amber-300 font-medium">₹{fee.toFixed(2)}/mo</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-3 py-2 bg-amber-500/5 text-xs font-bold">
                  <span className="text-amber-300">Total Mandatory</span>
                  <span className="text-amber-300">₹{totalMandatoryFees.toFixed(2)}/mo</span>
                </div>
              </div>
            </div>
          )}

          {/* Optional Responsibilities */}
          {optionalResps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Optional Services</h4>
              </div>
              <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
                {optionalResps.map(r => {
                  const rId = r.responsibilityId || r.id;
                  const fee = parseFloat(r.studentFee || r.student_fee || 0) || 0;
                  const isSelected = selectedOptionalResps.includes(rId);
                  return (
                    <label key={rId} className={`flex items-center gap-3 px-3 py-2.5 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/[0.02] ${isSelected ? 'bg-primary/10' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedOptionalResps(prev =>
                          prev.includes(rId) ? prev.filter(v => v !== rId) : [...prev, rId]
                        )}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="flex-1 text-xs text-white">{r.name}</span>
                      <span className="text-xs text-slate-400">₹{fee.toFixed(2)}/mo</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading or empty state */}
          {fetchingResps && (
            <div className="text-center text-xs text-slate-600 py-2">Loading space responsibilities...</div>
          )}
          {!fetchingResps && spaceResponsibilities.length === 0 && watchedClass && watchedSection && (
            <div className="text-center text-xs text-slate-600 py-2">No responsibilities assigned to {watchedClass}-{watchedSection}</div>
          )}

          {/* Manual Fee Entry */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={16} className="text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Additional Fee Components</h4>
            </div>
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/[0.02]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">Fee Component</th>
                    <th className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">Monthly Amount (₹)</th>
                    <th className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">Concession</th>
                    <th className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-white/[0.01] border-b border-white/5">
                    <td className="px-4 py-3"><input placeholder="e.g. Tuition" className="bg-transparent border-none text-xs text-white placeholder:text-slate-800 focus:outline-none w-full" /></td>
                    <td className="px-4 py-3"><input placeholder="0.00" className="bg-transparent border-none text-xs text-white placeholder:text-slate-800 focus:outline-none w-full" /></td>
                    <td className="px-4 py-3"><input placeholder="0%" className="bg-transparent border-none text-xs text-white placeholder:text-slate-800 focus:outline-none w-full" /></td>
                    <td className="px-4 py-3 text-right text-slate-600">...</td>
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
  ], [classOptions, mandatoryResps, optionalResps, selectedOptionalResps, totalMandatoryFees, fetchingResps, spaceResponsibilities, watchedClass, watchedSection]);

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