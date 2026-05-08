import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  User, Edit3, ArrowLeft, 
  AlertCircle, Smartphone, 
  GraduationCap, MapPin, Shield, Calendar, Phone, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import FormWidget from '../../../components/ui/FormWidget';
import StandardButton from '../../../components/ui/StandardButton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => localStorage.getItem('schoolId') || '';

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('summary');

  const { control, reset } = useForm();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/students/${schoolId}/${studentId}`);
        const data = await response.json();
        if (data) {
          const body = data.data || data;
          setStudentData(body);
          reset(body);
        } else {
            setError('Profile not found');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchProfile();
  }, [studentId, schoolId, reset]);

  const STUDENT_PROFILE_SCHEMA = [
    {
      id: 'summary', label: 'Summary', icon: Shield,
      customContent: (
        <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <span className="text-micro uppercase tracking-widest text-primary font-black mb-1 block">GRADE</span>
              <span className="text-xl font-black text-white italic">{studentData?.class || 'N/A'}</span>
           </div>
           <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <span className="text-micro uppercase tracking-widest text-white/40 font-black mb-1 block">SERIAL_ID</span>
              <span className="text-xl font-black text-white italic">{studentData?.rollNumber || 'N/A'}</span>
           </div>
           <div className="p-4 rounded-xl bg-success/5 border border-success/10 text-center">
              <span className="text-micro uppercase tracking-widest text-success font-black mb-1 block">SECTION</span>
              <span className="text-xl font-black text-white italic">{studentData?.section || 'A'}</span>
           </div>
        </div>
      )
    },
    {
      id: 'academic', label: 'Academic', icon: GraduationCap,
      fields: [
        { name: 'name', label: 'Full Name', type: 'text' },
        { name: 'dob', label: 'Date of Birth', type: 'date' },
        { name: 'rollNumber', label: 'ID / Roll', type: 'text' },
        { name: 'class', label: 'Current Grade', type: 'text' },
        { name: 'session', label: 'Academic Session', type: 'text' },
      ]
    },
    {
      id: 'family', label: 'Family & Contact', icon: Phone,
      fields: [
        { name: 'fatherName', label: "Father's Name", type: 'text' },
        { name: 'motherName', label: "Mother's Name", type: 'text' },
        { name: 'phone', label: 'Primary Contact', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Residential Address', type: 'text' },
      ]
    },
    {
        id: 'transport', label: 'Transport', icon: MapPin,
        fields: [
            { name: 'transportMode', label: 'Method', type: 'text' },
            { name: 'busRoute', label: 'Route Information', type: 'text' },
        ]
    }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="text-micro font-black uppercase tracking-widest text-slate-500 italic">RETRIEVING_ACADEMIC_NODE...</span>
    </div>
  );

  return (
    <div className="max-w-full p-1 space-y-1">
      {/* Hero */}
      <div className="relative h-20 bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.05),transparent_50%)]" />
        <div className="px-4 h-full flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/10" />
                <User size={24} className="text-primary" />
              </div>
              <div>
                 <h1 className="text-sm font-black text-white tracking-widest uppercase italic">{studentData?.name}</h1>
                 <p className="text-micro font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                   <GraduationCap size={10} className="text-primary" /> CLASS {studentData?.class} • SERIAL {studentData?.rollNumber}
                 </p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <StandardButton onClick={() => navigate(-1)} variant="ghost" size="xs" label="BACK" />
              <StandardButton 
                onClick={() => navigate(`/dashboard/student/add?mode=edit&studentId=${studentId}`)}
                variant="primary" size="xs" label="EDIT_PROFILE" icon={Edit3}
              />
           </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-1">
            <FormWidget 
                title="ACADEMIC_IDENTITY"
                description="NODE_SYNC: SYSTEM_REGISTER"
                sections={STUDENT_PROFILE_SCHEMA}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                control={control}
                mode="view"
                dense
            />
      </div>
    </div>
  );
}
