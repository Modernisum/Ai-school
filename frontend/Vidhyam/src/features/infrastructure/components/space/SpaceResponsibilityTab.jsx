import React from 'react';
import { Briefcase, User, AlertTriangle, DollarSign, Plus, X } from 'lucide-react';
import GlassCard from '../../../../components/ui/GlassCard';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';

export default function SpaceResponsibilityTab({
  responsibilities,
  isLoading,
  onAssign,
  onRemove,
}) {
  const totalMonthlyCost = React.useMemo(() => {
    return (responsibilities || []).reduce((sum, r) => sum + (r.monthlyPrice || 0), 0);
  }, [responsibilities]);

  if (isLoading) {
    return <div className="space-y-1">{[1, 2].map(i => <SkeletonLoader key={i} variant="card" className="h-12" />)}</div>;
  }

  if (!responsibilities || responsibilities.length === 0) {
    return (
      <div className="py-8 text-center flex flex-col items-center gap-2 opacity-40">
        <Briefcase size={20} />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">No responsibilities assigned</p>
        <StandardButton label="Assign Responsibility" icon={Plus} size="xs" onClick={onAssign} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {responsibilities.map((r, i) => {
        const hasEmployee = r.employeeName && r.employeeName !== 'Unassigned';
        return (
          <GlassCard key={r.responsibilityId || r.id || i} dense className="bg-white/[0.02]" hover>
            <div className="p-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {hasEmployee ? (
                    <User size={10} className="text-primary shrink-0" />
                  ) : (
                    <AlertTriangle size={10} className="text-amber-500 dark:text-amber-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{r.name || r.responsibilityName}</p>
                    <p className={`text-[8px] font-bold ${hasEmployee ? 'text-green-600 dark:text-green-400/60' : 'text-amber-600 dark:text-amber-400/60'}`}>
                      {hasEmployee ? r.employeeName : 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-800 dark:text-white">₹{r.monthlyPrice || 0}/mo</p>
                    {r.studentFee > 0 && <p className="text-[7px] text-slate-500 dark:text-slate-400 font-bold">₹{r.studentFee}/student</p>}
                  </div>
                  {hasEmployee && onRemove && (
                    <StandardButton variant="ghost" size="xs" icon={X}
                      onClick={() => onRemove(r)} className="text-rose-500" />
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })}
      <GlassCard dense className="bg-primary/5 border-primary/10">
        <div className="p-1.5 flex items-center justify-between">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Total Monthly Cost</span>
          <span className="text-[10px] font-black text-slate-800 dark:text-white">₹{totalMonthlyCost.toLocaleString()}/mo</span>
        </div>
      </GlassCard>
      <div className="pt-0.5">
        <StandardButton label="Assign Responsibility" icon={Plus} size="xs" onClick={onAssign} />
      </div>
    </div>
  );
}
