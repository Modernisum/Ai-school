import React from 'react';
import { 
  User, BookOpen, Users, Calendar, Clock, 
  Edit3, Phone, Mail, Fingerprint, Heart, 
  CalendarDays, Shield, Tag, Hash
} from 'lucide-react';
import { motion } from 'framer-motion';

const IdentitySection = ({ student, studentId, schoolId, onEdit }) => {
  const fmtDate = (date) => {
    if (!date) return 'Not Set';
    const d = new Date(date);
    return isNaN(d) ? 'Not Set' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const InfoCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.05] transition-all group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-200 truncate">{value || '—'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Primary Identification
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-tighter">Verified</span>
          </h3>
          <p className="text-slate-500 text-sm">Official student record for the academic session.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
            (student?.studentType || '').toLowerCase() === 'private'
            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <Tag size={12} />
            {student?.studentType || 'Regular'} Student
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800/50 border border-white/10 text-slate-400">
            <Hash size={12} />
            Roll: {student?.rollNumber || 'N/A'}
          </span>
        </div>
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Users} label="Class & Section" value={`${student?.className} - ${student?.section || 'A'}`} color="indigo" />
        <InfoCard icon={Shield} label="Status" value={student?.status === 'active' ? 'Active' : 'Inactive'} color={student?.status === 'active' ? 'emerald' : 'rose'} />
        <InfoCard icon={Calendar} label="Enrollment Date" value={student?.admissionDate} color="amber" />
        <InfoCard icon={Fingerprint} label="Aadhaar Number" value={student?.aadhaarNumber} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Family Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Heart size={16} className="text-rose-400" />
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Family & Personal</h4>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden divide-y divide-white/[0.05]">
            {[
              { label: "Father's Name", value: student?.fatherName },
              { label: "Mother's Name", value: student?.motherName },
              { label: "Date of Birth", value: student?.dob },
              { label: "Gender", value: student?.gender },
              { label: "TC Number", value: student?.tcNumber, highlight: 'text-amber-400' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center p-4 hover:bg-white/[0.01] transition-colors">
                <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                <span className={`text-sm font-bold ${item.highlight || 'text-slate-200'}`}>{item.value || 'Not Set'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Phone size={16} className="text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contact & Metadata</h4>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden divide-y divide-white/[0.05]">
            {[
              { label: "Primary Contact", value: student?.contact, icon: Phone, iconColor: 'text-emerald-500' },
              { label: "Email Address", value: student?.email, icon: Mail, iconColor: 'text-sky-500' },
              { label: "Profile Created", value: fmtDate(student?.createdAt), icon: CalendarDays, iconColor: 'text-indigo-500' },
              { label: "Last Modified", value: fmtDate(student?.updatedAt), icon: Clock, iconColor: 'text-violet-500' },
              { label: "Registration ID", value: studentId, highlight: 'font-mono text-indigo-400' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center p-4 hover:bg-white/[0.01] transition-colors">
                <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon size={12} className={item.iconColor} />}
                  <span className={`text-sm font-bold ${item.highlight || 'text-slate-200'}`}>{item.value || 'Not Set'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentitySection;
