import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  User, Edit3, ArrowLeft, 
  AlertCircle, Smartphone, 
  Briefcase, GraduationCap, DollarSign, Award, Shield, Calendar, Phone, FileText, CheckCircle, TrendingUp, PieChart, Trophy, Medal, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import FormWidget from '../../../components/ui/FormWidget';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const getSchoolId = () => localStorage.getItem('schoolId') || '';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const schoolId = getSchoolId();
  
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('summary');

  const { control, reset } = useForm();

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/employees/${schoolId}/${employeeId}`);
      const data = await response.json();
      if (data) {
        const body = data.data || data.employee || data;
        setEmployeeData(body);
        reset(body);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchProfile();
  }, [employeeId, schoolId]);

  // ─── Profile Schema ────────────────────────────────────────────────────────
  
  const PROFILE_SCHEMA = [
    {
      id: 'summary', label: 'OVERVIEW', icon: Shield,
      customContent: (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center">
              <span className="text-micro font-black text-primary uppercase tracking-widest mb-1 italic">JOIN_DATE</span>
              <span className="text-xs font-black text-white">{employeeData?.joinDate || 'N/A'}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 flex flex-col items-center justify-center text-center">
              <span className="text-micro font-black text-blue-400 uppercase tracking-widest mb-1 italic">POSITION_ID</span>
              <span className="text-xs font-black text-white uppercase italic tracking-tighter">{employeeData?.employeeType || employeeData?.type || 'Staff'}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center text-center">
              <span className="text-micro font-black text-emerald-400 uppercase tracking-widest mb-1 italic">DEPT_CORE</span>
              <span className="text-xs font-black text-white">{employeeData?.subject || 'General'}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-micro text-slate-700 font-black uppercase italic tracking-widest">BASE_SALARY</span>
                <span className="text-xs text-emerald-400 font-mono font-black">${employeeData?.baseSalary}</span>
             </div>
             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-micro text-slate-700 font-black uppercase italic tracking-widest">COMMS_LINK</span>
                <span className="text-xs text-white font-mono">{employeeData?.phone}</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-micro text-slate-700 font-black uppercase italic tracking-widest">SYSTEM_NODE</span>
                <span className="text-xs text-primary font-mono font-black uppercase italic">{employeeData?.employeeId || employeeId}</span>
             </div>
          </div>
        </div>
      )
    },
    {
      id: 'personal', label: 'Identity', icon: User,
      fields: [
        { name: 'name', label: 'Full Name', type: 'text' },
        { name: 'dob', label: 'Date of Birth', type: 'date' },
        { name: 'gender', label: 'Gender', type: 'text' },
        { name: 'aadhaarNumber', label: 'Aadhaar ID', type: 'text' },
        { name: 'fatherName', label: "Father's Name", type: 'text' },
        { name: 'motherName', label: "Mother's Name", type: 'text' },
        { name: 'image_url', label: 'Staff Photo', type: 'image' },
      ]
    },
    {
      id: 'employment', label: 'Job', icon: Briefcase,
      fields: [
        { name: 'employeeType', label: 'Designation', type: 'text' },
        { name: 'subject', label: 'Subject / Dept', type: 'text' },
        { name: 'baseSalary', label: 'Base Salary', type: 'number' },
        { name: 'joinDate', label: 'Joining Date', type: 'date' },
      ]
    },
    {
      id: 'finance', label: 'Finance', icon: DollarSign,
      customContent: (
        <div className="space-y-3">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-2">
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                 <div className="flex items-center gap-2 text-emerald-400 mb-0.5"><DollarSign size={10}/> <span className="text-micro font-black uppercase italic tracking-widest">BASE_CREDIT</span></div>
                 <p className="text-xs font-black text-white tracking-widest italic">${employeeData?.baseSalary}</p>
              </div>
              <div className="p-2 rounded bg-blue-500/5 border border-blue-500/10">
                 <div className="flex items-center gap-2 text-blue-400 mb-0.5"><TrendingUp size={10}/> <span className="text-micro font-black uppercase italic tracking-widest">DAILY_RATE</span></div>
                 <p className="text-xs font-black text-white tracking-widest italic">${(parseFloat(employeeData?.baseSalary || 0) / 30).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded bg-blue-500/5 border border-blue-500/10">
                 <div className="flex items-center gap-2 text-blue-400 mb-0.5"><PieChart size={10}/> <span className="text-micro font-black uppercase italic tracking-widest">QUOTA</span></div>
                 <p className="text-xs font-black text-white tracking-widest italic uppercase">FULL_PAY</p>
              </div>
           </div>
           
           <div>
              <h4 className="text-micro font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5 italic">
                <CheckCircle size={10} className="text-emerald-500" /> RESPONSIBILITIES
              </h4>
              <div className="space-y-1">
                 {(employeeData?.responsibilities || []).length > 0 ? (
                    employeeData.responsibilities.map((r, i) => (
                      <div key={i} className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xxs font-black text-white uppercase italic leading-none truncate">{r.responsibilityName}</p>
                          <p className="text-micro text-slate-700 font-black uppercase italic tracking-widest mt-0.5">{r.responsibilityType}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xxs font-black text-emerald-400 italic leading-none">${r.perDayPrice}/DAY</p>
                           <span className="text-micro font-black text-emerald-500 uppercase italic tracking-widest mt-0.5">ACTIVE</span>
                        </div>
                      </div>
                    ))
                 ) : (
                    <p className="text-micro text-slate-800 font-black italic py-4 text-center border border-dashed border-white/5 rounded-xl uppercase tracking-widest">NO_ASSIGNMENTS</p>
                 )}
              </div>
           </div>
        </div>
      )
    },
    {
      id: 'awards', label: 'Awards', icon: Award,
      customContent: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {(employeeData?.awards || []).length > 0 ? (
              employeeData.awards.map((a, i) => (
                 <div key={i} className="p-5 rounded-3xl bg-yellow-500/5 border border-yellow-500/10 relative overflow-hidden group">
                    <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:scale-110 transition-transform">
                       {a.position === '1st' ? <Trophy size={40} /> : a.position === '2nd' ? <Star size={40} /> : <Medal size={40} />}
                    </div>
                    <div className="relative z-10">
                       <h4 className="text-lg font-black text-white mb-1">{a.awardName}</h4>
                       <p className="text-xs text-slate-500 mb-3">{a.awardType}</p>
                       <p className="text-[11px] text-slate-400 line-clamp-2">{a.description}</p>
                    </div>
                 </div>
              ))
           ) : (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center glass-card border-dashed">
                 <Medal size={48} className="text-slate-700 mb-4" />
                 <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No records found</p>
              </div>
           )}
        </div>
      )
    }
  ];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-6" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Verifying staff credentials...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full glass-card p-10 border-red-500/20">
        <AlertCircle className="mx-auto text-red-500 mb-6" size={48} />
        <h2 className="text-2xl font-black text-white mb-2">Record Error</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={() => navigate(-1)} className="w-full py-4 bg-white/5 border border-white/5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
          <ArrowLeft size={18} /> Back to List
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-primary/30">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-primary/10 via-slate-1000 to-slate-1000 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)]" />
        
        <div className="max-w-full px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-500/10" />
              <User size={40} className="text-primary" />
            </motion.div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white tracking-widest uppercase italic leading-none">{employeeData?.name}</h1>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-micro font-black uppercase italic tracking-widest">
                  {employeeData?.employeeType || employeeData?.type || 'Staff'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 text-micro font-black uppercase italic tracking-widest">
                <span className="flex items-center gap-1.5"><Smartphone size={10} className="text-primary" /> {employeeData?.phone}</span>
                <span className="flex items-center gap-1.5"><Briefcase size={10} className="text-indigo-400" /> {employeeData?.subject || 'Dept_Core'}</span>
                <span className="font-mono text-primary/80">{employeeData?.employeeId || employeeId}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
             <StandardButton variant="ghost" size="xs" onClick={() => navigate(-1)} label="RETURN" />
             <StandardButton 
               variant="primary" 
               size="xs" 
               onClick={() => navigate(`/dashboard/employee/add?mode=edit&employeeId=${employeeId}`)}
               icon={Edit3}
               label="MODIFY_PROFILE"
             />
          </div>
        </div>
      </div>

      {/* Main Stats Hub */}
      <div className="max-w-full px-1 py-4">
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border-white/5 p-2 shadow-2xl bg-white/[0.01]">
            <FormWidget 
                dense
                title="STAFF_IDENTITY_MATRIX"
                description="Personnel history and financial data linkage"
                sections={PROFILE_SCHEMA}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                control={control}
                mode="view"
                onCancel={() => navigate(-1)}
            />
         </motion.div>
      </div>
    </div>
  );
}
