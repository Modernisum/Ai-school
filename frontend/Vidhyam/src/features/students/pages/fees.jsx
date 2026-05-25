import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, DollarSign, TrendingUp, Search, Filter,
  Download, Upload, Calendar, CheckCircle, AlertTriangle,
  Users, GraduationCap, Database, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useGetStudentsQuery } from '../api/studentApi';
import GlassCard from '../../../components/ui/GlassCard';
import KPITile from '../../../components/ui/KPITile';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function StudentFees() {
  const { schoolId } = useAuth();
  
  const { data: sData, isLoading: studentsLoading } = useGetStudentsQuery(schoolId);
  const students = useMemo(() => sData?.data || sData?.students || [], [sData]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const spaces = useMemo(() => {
    const spaceSet = new Set();
    students.forEach(s => {
      const sid = s.spaceId || s.space_id;
      if (sid) spaceSet.add(sid);
    });
    return ['All', ...Array.from(spaceSet).sort()];
  }, [students]);
  
  const feeData = useMemo(() => {
    return students.map(student => ({
      id: student.studentId || student.student_id,
      name: student.studentName || student.name,
      space: student.spaceId || student.space_id,
      totalFee: 25000,
      paid: Math.floor(Math.random() * 25000),
      dueDate: '2024-12-31',
      status: Math.random() > 0.3 ? 'Paid' : 'Pending',
      lastPayment: '2024-11-15'
    }));
  }, [students]);
  
  const filteredFees = useMemo(() => {
    return feeData.filter(fee => {
      const nameMatch = fee.name.toLowerCase().includes(searchTerm.toLowerCase());
      const spaceMatch = filterClass === 'All' || fee.space === filterClass;
      const statusMatch = filterStatus === 'All' || fee.status === filterStatus;
      return nameMatch && spaceMatch && statusMatch;
    });
  }, [feeData, searchTerm, filterClass, filterStatus]);
  
  const totals = useMemo(() => {
    let totalAmount = 0; let totalPaid = 0; let totalPending = 0;
    feeData.forEach(fee => {
      totalAmount += fee.totalFee;
      totalPaid += fee.paid;
      totalPending += (fee.totalFee - fee.paid);
    });
    return { totalAmount, totalPaid, totalPending };
  }, [feeData]);
  
  if (studentsLoading) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
  );

  return (
    <div className="max-w-full p-1 space-y-2 text-slate-400">
      <div className="space-y-2">
        <header className="flex justify-between items-center">
          <h1 className="text-sm font-black text-white tracking-tight uppercase italic">
            FEE <span className="text-primary">MANAGEMENT</span>
          </h1>
        </header>
        
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          <KPITile label="Total Revenue" value={`₹${totals.totalAmount.toLocaleString('en-IN')}`} icon={DollarSign} color="primary" dense />
          <KPITile label="Collected" value={`₹${totals.totalPaid.toLocaleString('en-IN')}`} icon={CreditCard} color="success" dense />
          <KPITile label="Outstanding" value={`₹${totals.totalPending.toLocaleString('en-IN')}`} icon={AlertTriangle} color="warning" dense />
          <KPITile label="Collection Rate" value={`${((totals.totalPaid / totals.totalAmount) * 100).toFixed(1)}%`} icon={TrendingUp} color="accent" dense />
        </motion.div>
        
        <GlassCard className="p-2 border border-white/5" dense>
          <div className="flex gap-1 items-center">
            <div className="relative flex-1 group">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
              <input className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-primary/20 transition-all font-black uppercase tracking-widest" placeholder="Search student fee records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-1">
              <select className="bg-slate-900 border border-white/5 rounded-lg py-1.5 px-3 text-micro text-slate-500 font-black uppercase focus:outline-none" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                {spaces.map((s, i) => <option key={i} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}