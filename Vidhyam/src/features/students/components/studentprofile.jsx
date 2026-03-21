import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, BookOpen, Clock, Edit3, ArrowLeft, 
  Loader, AlertCircle, RefreshCw, Smartphone, 
  MapPin, GraduationCap, Calendar, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load sections
const IdentitySection = lazy(() => import('./sections/IdentitySection'));
const AcademicSection = lazy(() => import('./sections/AcademicSection'));
const TransportSection = lazy(() => import('./sections/TransportSection'));
const FeeSection = lazy(() => import('./sections/FeeSection'));
const DocumentsSection = lazy(() => import('./sections/DocumentsSection'));

const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => localStorage.getItem('schoolId') || '622079';

const SectionLoader = () => (
  <div className="flex flex-col items-center justify-center py-16 animate-pulse">
    <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading Component...</p>
  </div>
);

const StudentProfile = () => {
  const { studentId: urlStudentId } = useParams();
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  
  // Use studentId from URL
  const studentId = urlStudentId;

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/students/${schoolId}/students/${studentId}/profile`);
      const data = await response.json();
      if (data.success) {
        setStudentData(data.data);
      } else {
        setError(data.message || 'Failed to load profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchProfile();
  }, [studentId, schoolId]);

  const TABS = [
    { id: 'personal', label: 'Identity', icon: User },
    { id: 'academic', label: 'Academics', icon: GraduationCap },
    { id: 'fee', label: 'Finance', icon: Clock },
    { id: 'transport', label: 'Transport', icon: MapPin },
    { id: 'documents', label: 'Records', icon: BookOpen },
  ];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
        <User className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={24} />
      </div>
      <p className="mt-6 text-slate-400 font-medium">Fetching secure records...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full glass-card p-8 border-rose-500/20 text-center">
        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary w-full justify-center">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Top Banner / Header */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
        </div>
        
        <div className="absolute bottom-0 left-0 w-full p-6 flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-2xl bg-slate-900 border-4 border-slate-950 shadow-2xl flex items-center justify-center -mb-8 overflow-hidden relative z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20" />
              <User size={56} className="text-indigo-400" />
            </motion.div>
            
            <div className="pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{studentData?.student?.name}</h1>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  studentData?.student?.status === 'active' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {studentData?.student?.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-slate-500" /> {studentData?.student?.contact}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-500" /> Joined {studentData?.student?.admissionDate}</span>
                <span className="flex items-center gap-1.5 text-indigo-400 font-mono font-bold">{studentData?.student?.studentId}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pb-2">
             <button onClick={() => navigate(-1)} className="btn-secondary h-10 px-4">
               <ArrowLeft size={16} /> Back
             </button>
             <button 
               onClick={() => navigate(`/dashboard/student/addstudent?mode=edit&studentId=${studentId}`)}
               className="btn-primary h-10 px-4 group"
             >
               <Edit3 size={16} className="group-hover:rotate-12 transition-transform" /> 
               Edit Profile
             </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="pt-12 px-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.04]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-semibold transition-all relative ${
                activeTab === tab.id 
                ? 'text-indigo-400 bg-white/5' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<SectionLoader />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-8 border-white/[0.05]"
              >
                {activeTab === 'personal' && (
                  <IdentitySection 
                    student={studentData?.student} 
                    studentId={studentId} 
                    schoolId={schoolId} 
                    onEdit={() => navigate(`/dashboard/student/addstudent?mode=edit&studentId=${studentId}`)}
                  />
                )}
                {activeTab === 'academic' && (
                  <AcademicSection 
                    student={studentData?.student} 
                    subjects={studentData?.student?.enrolledSubjects} 
                  />
                )}
                {activeTab === 'fee' && (
                  <FeeSection 
                    studentId={studentId} 
                    schoolId={schoolId} 
                  />
                )}
                {activeTab === 'transport' && (
                  <TransportSection 
                    studentId={studentId} 
                    schoolId={schoolId} 
                  />
                )}
                {activeTab === 'documents' && (
                  <DocumentsSection 
                    studentId={studentId} 
                    schoolId={schoolId} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
