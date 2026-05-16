import React from 'react';
import { IndianRupee, Users, TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';

export default function FinancialOverviewWidget({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} variant="card" className="h-16" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <GlassCard dense className="bg-white/[0.02] p-3 text-center opacity-40">
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">NO_FINANCIAL_DATA</p>
      </GlassCard>
    );
  }

  const isProfitable = data.netRevenue >= 0;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <GlassCard dense className="bg-emerald-500/5 border-emerald-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <IndianRupee size={10} className="text-emerald-400" />
          <p className="text-[7px] font-bold text-emerald-400/80 uppercase tracking-widest">Salary Cost</p>
        </div>
        <p className="text-[11px] font-black text-white">₹{data.totalMonthlySalaryCost?.toLocaleString() ?? '0'}</p>
      </GlassCard>

      <GlassCard dense className="bg-blue-500/5 border-blue-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <IndianRupee size={10} className="text-blue-400" />
          <p className="text-[7px] font-bold text-blue-400/80 uppercase tracking-widest">Student Fees</p>
        </div>
        <p className="text-[11px] font-black text-white">₹{data.totalStudentFees?.toLocaleString() ?? '0'}</p>
      </GlassCard>

      <GlassCard dense className="p-1.5" style={{ borderColor: isProfitable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', backgroundColor: isProfitable ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {isProfitable ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-rose-400" />}
          <p className="text-[7px] font-bold uppercase tracking-widest" style={{ color: isProfitable ? 'rgba(52,211,153,0.8)' : 'rgba(251,113,133,0.8)' }}>Net Revenue</p>
        </div>
        <p className="text-[11px] font-black" style={{ color: isProfitable ? 'rgb(52,211,153)' : 'rgb(251,113,133)' }}>₹{data.netRevenue?.toLocaleString() ?? '0'}</p>
      </GlassCard>

      <GlassCard dense className="bg-violet-500/5 border-violet-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Users size={10} className="text-violet-400" />
          <p className="text-[7px] font-bold text-violet-400/80 uppercase tracking-widest">Staff : Students</p>
        </div>
        <p className="text-[11px] font-black text-white">{data.employeeCount ?? 0} : {data.studentCount ?? 0}</p>
      </GlassCard>
    </div>
  );
}
