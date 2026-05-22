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
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">No financial data available</p>
      </GlassCard>
    );
  }

  const isProfitable = data.netRevenue >= 0;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <GlassCard dense className="bg-emerald-500/5 border-emerald-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <IndianRupee size={10} className="text-emerald-600 dark:text-emerald-400" />
          <p className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400/80 uppercase tracking-widest">Salary Cost</p>
        </div>
        <p className="text-[11px] font-black text-slate-800 dark:text-white">₹{data.totalMonthlySalaryCost?.toLocaleString() ?? '0'}</p>
      </GlassCard>

      <GlassCard dense className="bg-blue-500/5 border-blue-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <IndianRupee size={10} className="text-blue-600 dark:text-blue-400" />
          <p className="text-[7px] font-bold text-blue-600 dark:text-blue-400/80 uppercase tracking-widest">Student Fees</p>
        </div>
        <p className="text-[11px] font-black text-slate-800 dark:text-white">₹{data.totalStudentFees?.toLocaleString() ?? '0'}</p>
      </GlassCard>

      <GlassCard 
        dense 
        className={`p-1.5 border-dashed ${
          isProfitable 
            ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30' 
            : 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 dark:border-rose-500/30'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          {isProfitable ? (
            <TrendingUp size={10} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TrendingDown size={10} className="text-rose-600 dark:text-rose-400" />
          )}
          <p 
            className={`text-[7px] font-bold uppercase tracking-widest ${
              isProfitable 
                ? 'text-emerald-600 dark:text-emerald-400/80' 
                : 'text-rose-600 dark:text-rose-400/80'
            }`}
          >
            Net Revenue
          </p>
        </div>
        <p 
          className={`text-[11px] font-black ${
            isProfitable 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          ₹{data.netRevenue?.toLocaleString() ?? '0'}
        </p>
      </GlassCard>

      <GlassCard dense className="bg-violet-500/5 border-violet-500/10 p-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Users size={10} className="text-violet-600 dark:text-violet-400" />
          <p className="text-[7px] font-bold text-violet-600 dark:text-violet-400/80 uppercase tracking-widest">Staff : Students</p>
        </div>
        <p className="text-[11px] font-black text-slate-800 dark:text-white">{data.employeeCount ?? 0} : {data.studentCount ?? 0}</p>
      </GlassCard>
    </div>
  );
}
