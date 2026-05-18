import React, { useMemo } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function SalaryBreakdownWidget({
  baseSalary,
  spacesCount,
  experienceIncrementPercent,
  onIncrementChange,
}) {
  const breakdown = useMemo(() => {
    const base = parseFloat(baseSalary) || 0;
    const spaceMultiplier = spacesCount || 1;
    const spacesComponent = base * spaceMultiplier;
    const incPct = parseFloat(experienceIncrementPercent) || 0;
    const increment = spacesComponent * (incPct / 100);
    const total = spacesComponent + increment;

    return { base, spacesComponent, increment, incPct, total };
  }, [baseSalary, spacesCount, experienceIncrementPercent]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="border border-white/5 rounded-xl bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign size={14} className="text-emerald-400" />
        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
          Salary Breakdown
        </h4>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Base Responsibility</span>
          <span className="text-white font-medium">{formatCurrency(breakdown.base)}/mo</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">× Assigned Spaces</span>
          <span className="text-white font-medium">{spacesCount || 1}</span>
        </div>
        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-1.5">
          <span className="text-slate-300">Spaces Component</span>
          <span className="text-white font-medium">{formatCurrency(breakdown.spacesComponent)}/mo</span>
        </div>

        <div className="border-t border-white/5 pt-1.5 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-blue-400" />
            <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
              Experience Increment ({breakdown.incPct}%)
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={breakdown.incPct}
            onChange={(e) => onIncrementChange?.(e.target.value)}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>50%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Increment Amount</span>
            <span className="text-blue-300 font-medium">+{formatCurrency(breakdown.increment)}/mo</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-emerald-500/20 pt-1.5 mt-1">
          <span className="text-emerald-300 font-bold">Total Monthly Salary</span>
          <span className="text-emerald-300 font-bold text-sm">
            {formatCurrency(breakdown.total)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
