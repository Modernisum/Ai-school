import React from 'react';
import { Users, Eye } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';

export default function SpaceConsumersTab({ students, isLoading }) {
  const totalFeeRevenue = React.useMemo(() => {
    return (students || []).reduce((sum, s) => sum + (s.totalFees || 0), 0);
  }, [students]);

  if (isLoading) {
    return <div className="space-y-1">{[1, 2].map(i => <SkeletonLoader key={i} variant="card" className="h-10" />)}</div>;
  }

  if (!students || students.length === 0) {
    return (
      <div className="py-8 text-center flex flex-col items-center gap-2 opacity-40">
        <Users size={20} />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">No consumers assigned</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {students.map((s, i) => (
        <GlassCard key={s.studentId || i} dense className="bg-white/[0.02]" hover>
          <div className="p-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[7px] font-black text-primary">{s.name?.[0] || '?'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{s.name}</p>
                <p className="text-[7px] font-bold text-slate-500 dark:text-slate-400">Class {s.class}-{s.section}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-green-600 dark:text-green-400">₹{(s.totalFees || 0).toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>
      ))}
      <GlassCard dense className="bg-primary/5 border-primary/10">
        <div className="p-1.5 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Total Students</span>
            <span className="text-[10px] font-black text-slate-800 dark:text-white ml-2">{students.length}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Fee Revenue</span>
            <span className="text-[10px] font-black text-slate-800 dark:text-white ml-2">₹{totalFeeRevenue.toLocaleString()}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
